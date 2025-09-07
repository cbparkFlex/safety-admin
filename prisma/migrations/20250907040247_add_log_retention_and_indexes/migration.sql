-- CreateTable
CREATE TABLE "log_retention_policies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "log_type" TEXT NOT NULL,
    "severity" TEXT,
    "retention_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_cleanup" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "log_retention_policies_log_type_severity_key" ON "log_retention_policies"("log_type", "severity");

-- CreateIndex
CREATE INDEX "monitoring_logs_created_at_idx" ON "monitoring_logs"("created_at");

-- CreateIndex
CREATE INDEX "monitoring_logs_severity_idx" ON "monitoring_logs"("severity");

-- CreateIndex
CREATE INDEX "monitoring_logs_type_idx" ON "monitoring_logs"("type");

-- CreateIndex
CREATE INDEX "proximity_alerts_created_at_idx" ON "proximity_alerts"("created_at");

-- CreateIndex
CREATE INDEX "proximity_alerts_is_alert_idx" ON "proximity_alerts"("is_alert");

-- CreateIndex
CREATE INDEX "proximity_alerts_beacon_id_gateway_id_idx" ON "proximity_alerts"("beacon_id", "gateway_id");
