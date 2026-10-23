-- VDS: 3 günlük deneme lisansı (Süresiz bug fix)
USE sefpos45;
GO

DECLARE @ck NVARCHAR(256);
SELECT @ck = cc.name
FROM sys.check_constraints cc
INNER JOIN sys.columns c
  ON c.object_id = cc.parent_object_id AND c.column_id = cc.parent_column_id
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.tenants')
  AND c.name = N'subscription_status';
IF @ck IS NOT NULL
  EXEC(N'ALTER TABLE dbo.tenants DROP CONSTRAINT [' + @ck + N']');
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.tenants')
    AND name = N'CK_tenants_subscription_status'
)
ALTER TABLE dbo.tenants WITH NOCHECK
ADD CONSTRAINT CK_tenants_subscription_status
CHECK (subscription_status IN (N'active', N'suspended', N'cancelled', N'trial'));
GO

IF EXISTS (
  SELECT 1 FROM sys.default_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.tenants')
    AND COL_NAME(parent_object_id, parent_column_id) = N'subscription_status'
)
BEGIN
  DECLARE @df NVARCHAR(256);
  SELECT @df = name FROM sys.default_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.tenants')
    AND COL_NAME(parent_object_id, parent_column_id) = N'subscription_status';
  EXEC(N'ALTER TABLE dbo.tenants DROP CONSTRAINT [' + @df + N']');
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.default_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.tenants')
    AND name = N'DF_tenants_subscription_status'
)
ALTER TABLE dbo.tenants ADD CONSTRAINT DF_tenants_subscription_status DEFAULT (N'trial') FOR subscription_status;
GO

IF EXISTS (
  SELECT 1 FROM sys.default_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.tenants')
    AND COL_NAME(parent_object_id, parent_column_id) = N'subscription_plan'
)
BEGIN
  DECLARE @dfp NVARCHAR(256);
  SELECT @dfp = name FROM sys.default_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.tenants')
    AND COL_NAME(parent_object_id, parent_column_id) = N'subscription_plan';
  EXEC(N'ALTER TABLE dbo.tenants DROP CONSTRAINT [' + @dfp + N']');
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.default_constraints
  WHERE parent_object_id = OBJECT_ID(N'dbo.tenants')
    AND name = N'DF_tenants_subscription_plan'
)
ALTER TABLE dbo.tenants ADD CONSTRAINT DF_tenants_subscription_plan DEFAULT (N'trial') FOR subscription_plan;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = N'sp_create_tenant_and_user')
    DROP PROCEDURE sp_create_tenant_and_user;
GO
CREATE PROCEDURE sp_create_tenant_and_user
    @email NVARCHAR(255),
    @password_hash NVARCHAR(255),
    @full_name NVARCHAR(255),
    @tenant_name NVARCHAR(255),
    @tenant_slug NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @user_id UNIQUEIDENTIFIER = NEWID();
        DECLARE @tenant_id UNIQUEIDENTIFIER = NEWID();
        DECLARE @branch_id UNIQUEIDENTIFIER = NEWID();
        DECLARE @admin_role_id UNIQUEIDENTIFIER = NEWID();
        DECLARE @waiter_role_id UNIQUEIDENTIFIER = NEWID();
        DECLARE @cashier_role_id UNIQUEIDENTIFIER = NEWID();

        IF NOT EXISTS (SELECT 1 FROM app_users WHERE email = @email)
        BEGIN
            INSERT INTO app_users (id, email, password_hash)
            VALUES (@user_id, @email, @password_hash);

            INSERT INTO tenants (
                id, name, slug, email, onboarding_completed,
                subscription_status, subscription_plan, subscription_expires_at
            )
            VALUES (
                @tenant_id, @tenant_name, @tenant_slug, @email, 0,
                N'trial', N'trial', DATEADD(day, 3, GETUTCDATE())
            );

            INSERT INTO branches (id, tenant_id, name, is_main, is_active)
            VALUES (@branch_id, @tenant_id, N'Ana Sube', 1, 1);

            INSERT INTO roles (id, tenant_id, name, permissions) VALUES (
                @admin_role_id, @tenant_id, N'Yonetici',
                N'{"can_view_tables":true,"can_take_orders":true,"can_process_payments":true,"can_manage_products":true,"can_manage_users":true,"can_view_reports":true,"can_manage_cash_register":true,"can_manage_settings":true,"can_view_cancel_logs":true,"can_end_of_day":true,"can_manage_discounts":true,"can_delete_order_items":true}'
            );
            INSERT INTO roles (id, tenant_id, name, permissions) VALUES (
                @waiter_role_id, @tenant_id, N'Garson',
                N'{"can_view_tables":true,"can_take_orders":true,"can_process_payments":false,"can_manage_products":false,"can_manage_users":false,"can_view_reports":false,"can_manage_cash_register":false,"can_manage_settings":false,"can_view_cancel_logs":false,"can_end_of_day":false,"can_manage_discounts":false,"can_delete_order_items":true}'
            );
            INSERT INTO roles (id, tenant_id, name, permissions) VALUES (
                @cashier_role_id, @tenant_id, N'Kasiyer',
                N'{"can_view_tables":true,"can_take_orders":false,"can_process_payments":true,"can_manage_products":false,"can_manage_users":false,"can_view_reports":false,"can_manage_cash_register":true,"can_manage_settings":false,"can_view_cancel_logs":false,"can_end_of_day":false,"can_manage_discounts":false,"can_delete_order_items":false}'
            );

            INSERT INTO profiles (id, tenant_id, branch_id, role_id, email, full_name, role, onboarding_completed)
            VALUES (@user_id, @tenant_id, @branch_id, @admin_role_id, @email, @full_name, 'owner', 0);
        END
        ELSE
        BEGIN
            SELECT @user_id = u.id, @tenant_id = p.tenant_id, @branch_id = p.branch_id
            FROM app_users u LEFT JOIN profiles p ON p.id = u.id
            WHERE u.email = @email;
        END

        SELECT @user_id AS user_id, @tenant_id AS tenant_id, @branch_id AS branch_id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @errMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @errSev INT = ERROR_SEVERITY();
        DECLARE @errState INT = ERROR_STATE();
        RAISERROR(@errMsg, @errSev, @errState);
    END CATCH;
END;
GO

UPDATE dbo.tenants
SET
  subscription_status = N'trial',
  subscription_plan = N'trial',
  subscription_expires_at = COALESCE(
    subscription_expires_at,
    DATEADD(day, 3, ISNULL(created_at, GETUTCDATE()))
  )
WHERE
  (subscription_status = N'active' OR subscription_status IS NULL)
  AND (subscription_plan IS NULL OR LTRIM(RTRIM(subscription_plan)) = N'')
  AND subscription_expires_at IS NULL
  AND created_at >= DATEADD(day, -14, GETUTCDATE());
GO

SELECT name, subscription_status, subscription_plan, subscription_expires_at, created_at
FROM dbo.tenants
ORDER BY created_at DESC;
GO
