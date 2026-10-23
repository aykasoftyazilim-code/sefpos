-- VDS: şube sabit iskonto kolonları
USE sefpos45;
GO

IF COL_LENGTH('branches', 'default_discount_percent') IS NULL
    ALTER TABLE branches ADD default_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0;
IF COL_LENGTH('branches', 'default_discount_active') IS NULL
    ALTER TABLE branches ADD default_discount_active BIT NOT NULL DEFAULT 0;
GO

SELECT TOP 5 id, name, default_discount_percent, default_discount_active
FROM branches
ORDER BY created_at DESC;
GO
