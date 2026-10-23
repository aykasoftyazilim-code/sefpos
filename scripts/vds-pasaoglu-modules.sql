UPDATE tenants
SET disabled_modules = N'["tables","takeaway","online-orders","inventory"]',
    onboarding_completed = 1,
    phone = COALESCE(NULLIF(LTRIM(RTRIM(phone)), N''), N'05325178050')
WHERE id = '2258AE61-0499-4A98-ACDC-0F6D4DFFB32D';

SELECT id, name,
       CAST(disabled_modules AS NVARCHAR(200)) AS mods,
       onboarding_completed,
       phone
FROM tenants
WHERE id = '2258AE61-0499-4A98-ACDC-0F6D4DFFB32D';
