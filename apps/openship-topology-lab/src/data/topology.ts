export type ServiceKind =
  | "web"
  | "api"
  | "worker"
  | "postgres"
  | "redis"
  | "queue"
  | "cron"
  | "storage";

export type Protocol = "http" | "tcp" | "pub/sub";

/** What the user asked the service to do. `degraded` is derived, never stored. */
export type Lifecycle = "running" | "restarting" | "stopped";
export type ServiceStatus = Lifecycle | "degraded";

export interface ServiceSpec {
  id: string;
  name: string;
  kind: ServiceKind;
  image: string;
  port: number;
  env: string[];
}

/** An edge from a consumer to the service it depends on. */
export interface ConnectionSpec {
  id: string;
  source: string;
  target: string;
  protocol: Protocol;
}

export const SERVICES: ServiceSpec[] = [
  {
    id: "web",
    name: "web",
    kind: "web",
    image: "shipyard/web:1.14.2",
    port: 3000,
    env: ["NODE_ENV", "API_URL", "SENTRY_DSN"],
  },
  {
    id: "api",
    name: "api",
    kind: "api",
    image: "shipyard/api:1.14.2",
    port: 8080,
    env: ["DATABASE_URL", "REDIS_URL", "QUEUE_URL", "S3_BUCKET", "JWT_SECRET"],
  },
  {
    id: "worker",
    name: "worker",
    kind: "worker",
    image: "shipyard/worker:1.14.2",
    port: 9090,
    env: ["DATABASE_URL", "QUEUE_URL", "S3_BUCKET", "CONCURRENCY"],
  },
  {
    id: "cron",
    name: "cron",
    kind: "cron",
    image: "shipyard/cron:1.14.2",
    port: 9091,
    env: ["API_URL", "SCHEDULE_TZ"],
  },
  {
    id: "postgres",
    name: "postgres",
    kind: "postgres",
    image: "postgres:16.4-alpine",
    port: 5432,
    env: ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"],
  },
  {
    id: "redis",
    name: "redis",
    kind: "redis",
    image: "redis:7.4-alpine",
    port: 6379,
    env: ["REDIS_PASSWORD", "MAXMEMORY_POLICY"],
  },
  {
    id: "queue",
    name: "queue",
    kind: "queue",
    image: "nats:2.10-alpine",
    port: 4222,
    env: ["NATS_AUTH_TOKEN", "JETSTREAM_ENABLED"],
  },
  {
    id: "storage",
    name: "object storage",
    kind: "storage",
    image: "minio/minio:RELEASE.2024-08-03",
    port: 9000,
    env: ["MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD", "MINIO_REGION"],
  },
];

export const CONNECTIONS: ConnectionSpec[] = [
  { id: "web-api", source: "web", target: "api", protocol: "http" },
  { id: "cron-api", source: "cron", target: "api", protocol: "http" },
  { id: "api-postgres", source: "api", target: "postgres", protocol: "tcp" },
  { id: "api-redis", source: "api", target: "redis", protocol: "tcp" },
  { id: "api-queue", source: "api", target: "queue", protocol: "pub/sub" },
  { id: "worker-queue", source: "worker", target: "queue", protocol: "pub/sub" },
  { id: "worker-postgres", source: "worker", target: "postgres", protocol: "tcp" },
  { id: "worker-storage", source: "worker", target: "storage", protocol: "http" },
];

export const SERVICE_BY_ID: Record<string, ServiceSpec> = Object.fromEntries(
  SERVICES.map((s) => [s.id, s]),
);
