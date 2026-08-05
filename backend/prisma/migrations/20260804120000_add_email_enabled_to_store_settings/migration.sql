-- AlterTable
-- Move the customer-notification switch out of the environment and into the
-- store configuration row, so it can be toggled from the admin dashboard.
-- Additive and defaulted, so existing rows keep notifications off.
ALTER TABLE "StoreSettings" ADD COLUMN "emailEnabled" BOOLEAN NOT NULL DEFAULT false;
