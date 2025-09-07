-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_log_retention_policies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'all',
    "retention_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_cleanup" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_log_retention_policies" ("created_at", "id", "is_active", "last_cleanup", "log_type", "retention_days", "severity", "updated_at") SELECT "created_at", "id", "is_active", "last_cleanup", "log_type", "retention_days", coalesce("severity", 'all') AS "severity", "updated_at" FROM "log_retention_policies";
DROP TABLE "log_retention_policies";
ALTER TABLE "new_log_retention_policies" RENAME TO "log_retention_policies";
CREATE UNIQUE INDEX "log_retention_policies_log_type_severity_key" ON "log_retention_policies"("log_type", "severity");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
