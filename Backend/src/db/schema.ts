import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  deviceId: varchar("deviceId", { length: 255 }).unique(),
  deviceKey: varchar("deviceKey", { length: 255 }),
  monitorItem: varchar("monitorItem", { length: 255 }),
  customName: varchar("customName", { length: 255 }),
  deviceName: varchar("deviceName", { length: 255 }),
  warningLevel: integer("warning_level").notNull().default(0),
  latitude: varchar("latitude", { length: 100 }),
  longitude: varchar("longitude", { length: 100 })
})

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstname: varchar("firstname", { length: 255 }),
  lastname: varchar("lastname", { length: 255 }),
  username: varchar("username", { length: 255 }).unique(),
  email: varchar("email", { length: 255 }).unique(),
  role: varchar("role", { length: 100 }),
  password: varchar("password", { length: 255 })
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).unique(),
  expires_at: varchar("expires_at", { length: 100 })
})

export const deviceData = pgTable(
  "device_data",
  {
    id: serial("id").primaryKey(),
    deviceId: varchar("deviceId", { length: 255 }),
    monitorItem: varchar("monitorItem", { length: 255 }),
    monitorTime: varchar("monitorTime", { length: 100 }),
    monitorValue: varchar("monitorValue", { length: 100 })
  },
  (table) => ({
    deviceTimeUnique: uniqueIndex("unique_device_time").on(
      table.deviceId,
      table.monitorTime
    )
  })
)

export const deviceOwners = pgTable(
  "device_owners",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    deviceId: integer("device_id").references(() => devices.id, { onDelete: "cascade" })
  },
  (table) => ({
    deviceOwnerUnique: uniqueIndex("unique_device_owner").on(
      table.userId,
      table.deviceId
    )
  })
)

export const cacheEntries = pgTable("cache_entries", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
})

export const stationDevices = pgTable(
  "station_devices",
  {
    id: serial("id").primaryKey(),
    stationId: varchar("station_id", { length: 100 }),
    deviceId: integer("device_id").references(() => devices.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }),
    latitude: varchar("latitude", { length: 100 }),
    longitude: varchar("longitude", { length: 100 })
  }
)
