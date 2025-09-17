-- CreateTable
CREATE TABLE "realtime_rssi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "beacon_id" TEXT NOT NULL,
    "gateway_id" TEXT NOT NULL,
    "rssi" INTEGER NOT NULL,
    "distance" REAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "realtime_rssi_beacon_id_fkey" FOREIGN KEY ("beacon_id") REFERENCES "beacons" ("beacon_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "realtime_rssi_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "gateways" ("gateway_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "realtime_rssi_beacon_id_gateway_id_key" ON "realtime_rssi"("beacon_id", "gateway_id");
