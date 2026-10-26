import { parseLogContent } from './parser';
import { LogEntry } from '../types/log';

// Helper to generate timestamps relative to current time
function getRecentTime(minutesAgo: number, secondsOffset: number = 0): string {
  const d = new Date(Date.now() - (minutesAgo * 60 * 1000) + (secondsOffset * 1000));
  const pad = (n: number) => n.toString().padStart(2, '0');
  const padMs = (n: number) => n.toString().padStart(3, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${padMs(d.getMilliseconds())}`;
}

function getNginxTime(minutesAgo: number, secondsOffset: number = 0): string {
  const d = new Date(Date.now() - (minutesAgo * 60 * 1000) + (secondsOffset * 1000));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${months[d.getMonth()]}/${d.getFullYear()}:${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} +0000`;
}

function getSyslogTime(minutesAgo: number, secondsOffset: number = 0): string {
  const d = new Date(Date.now() - (minutesAgo * 60 * 1000) + (secondsOffset * 1000));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${months[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export interface DemoDataset {
  id: string;
  name: string;
  badge: string;
  description: string;
  format: 'SPRING_JAVA' | 'NGINX_APACHE' | 'SYSLOG' | 'JSON';
  generateRaw: () => string;
}

export const DEMO_DATASETS: DemoDataset[] = [
  {
    id: 'k8s-db-pool-incident',
    name: 'Panne Microservices & Pool PostgreSQL',
    badge: 'Critique SRE',
    description: 'Saturation brutale du pool HikariCP, cascade de timeouts et exceptions NullPointer sur le service de facturation.',
    format: 'SPRING_JAVA',
    generateRaw: () => {
      const lines: string[] = [];
      // Nominal traffic first
      for (let i = 25; i > 12; i--) {
        lines.push(`${getRecentTime(i, 5)} INFO 1 --- [nio-8080-exec-1] c.e.payment.controller.OrderApi : Processing order ORD-${1000 + i} for user_id=u_${i * 3}`);
        lines.push(`${getRecentTime(i, 8)} INFO 1 --- [nio-8080-exec-2] c.e.payment.service.BillingService : Stripe payment intent confirmed: pi_live_${i * 92}`);
        lines.push(`${getRecentTime(i, 15)} INFO 1 --- [nio-8080-exec-3] c.e.inventory.service.StockService : Stock reserved for SKU-ALPHA-${i}`);
      }

      // Latency begins to build up
      for (let i = 12; i > 8; i--) {
        lines.push(`${getRecentTime(i, 10)} WARN 1 --- [HikariPool-1 housekeeper] com.zaxxer.hikari.pool.HikariPool : HikariPool-1 - Connection pool usage is at 95% (48/50 active). Average wait time: 1450ms`);
        lines.push(`${getRecentTime(i, 20)} WARN 1 --- [nio-8080-exec-4] c.e.payment.service.BillingService : Slow query detected on table 'payments' duration=2840ms query='SELECT * FROM payments WHERE status = ? FOR UPDATE'`);
      }

      // Catastrophic failure starts
      for (let i = 8; i > 0; i--) {
        lines.push(`${getRecentTime(i, 1)} ERROR 1 --- [nio-8080-exec-5] com.zaxxer.hikari.pool.HikariPool : HikariPool-1 - Connection is not available, request timed out after 30005ms.`);
        lines.push(`\tat com.zaxxer.hikari.pool.HikariPool.createTimeoutException(HikariPool.java:696)
\tat com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:197)
\tat com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:162)
\tat com.zaxxer.hikari.HikariDataSource.getConnection(HikariDataSource.java:128)
\tat org.hibernate.engine.jdbc.connections.internal.DatasourceConnectionProviderImpl.getConnection(DatasourceConnectionProviderImpl.java:122)
\tat com.example.payment.service.BillingService.executeTransaction(BillingService.java:142)
Caused by: org.postgresql.util.PSQLException: FATAL: remaining connection slots are reserved for non-replication superuser connections
\tat org.postgresql.core.v3.ConnectionFactoryImpl.doAuthentication(ConnectionFactoryImpl.java:614)
\tat org.postgresql.core.v3.ConnectionFactoryImpl.tryConnect(ConnectionFactoryImpl.java:180)`);

        lines.push(`${getRecentTime(i, 3)} ERROR 1 --- [nio-8080-exec-6] c.e.payment.service.BillingService : Transaction failed for customer cust_84920: org.springframework.dao.CannotAcquireLockException: could not extract ResultSet`);
        lines.push(`${getRecentTime(i, 6)} FATAL 1 --- [nio-8080-exec-7] c.e.auth.filter.JwtAuthenticationFilter : Critical authentication service deadlock: Redis session cache replica unreachable`);
        lines.push(`${getRecentTime(i, 12)} ERROR 1 --- [nio-8080-exec-8] c.e.gateway.CircuitBreaker : CircuitBreaker 'billing-service' state changed from CLOSED to OPEN (failure rate: 84.6% >= 50.0%)`);
        lines.push(`${getRecentTime(i, 18)} ERROR 1 --- [nio-8080-exec-9] c.e.payment.controller.OrderApi : NullPointerException: paymentSession was null during webhook verification`);
        lines.push(`\tat com.example.payment.controller.OrderApi.handleWebhook(OrderApi.java:94)
\tat java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
\tat org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)`);
      }

      return lines.join('\n');
    },
  },
  {
    id: 'nginx-ddos-502-incident',
    name: 'Cluster Nginx & Ingress (Attaque & 502 Bad Gateway)',
    badge: 'Infrastructure Web',
    description: 'Volume massif de scans malveillants, dépassement de mémoire des workers php-fpm et avalanche de codes HTTP 502/504.',
    format: 'NGINX_APACHE',
    generateRaw: () => {
      const lines: string[] = [];
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        'Go-http-client/1.1',
        'curl/7.88.1 (Bot/Scanner v2.1)',
        'python-requests/2.31.0',
      ];

      // Regular traffic
      for (let i = 20; i > 12; i--) {
        lines.push(`92.184.102.14 - - [${getNginxTime(i, 5)}] "GET /api/v1/products?category=electronics HTTP/1.1" 200 4821 "https://store.company.com/" "${userAgents[0]}" 0.042`);
        lines.push(`81.250.33.88 - - [${getNginxTime(i, 8)}] "GET /assets/app.chunk.js HTTP/1.1" 200 24892 "https://store.company.com/" "${userAgents[1]}" 0.012`);
        lines.push(`194.206.12.9 - user_alice [${getNginxTime(i, 15)}] "POST /api/v1/cart/items HTTP/1.1" 200 642 "https://store.company.com/cart" "${userAgents[0]}" 0.089`);
      }

      // Attack & upstream starvation
      const attackerIps = ['198.51.100.42', '198.51.100.43', '203.0.113.88', '185.220.101.5', '45.154.255.12'];
      const exploitPaths = ['/.env', '/wp-login.php', '/phpmyadmin/index.php', '/.git/config', '/api/v1/admin/debug'];

      for (let i = 12; i > 0; i--) {
        // Scanners
        for (let j = 0; j < 3; j++) {
          const ip = attackerIps[j % attackerIps.length];
          const path = exploitPaths[(i + j) % exploitPaths.length];
          lines.push(`${ip} - - [${getNginxTime(i, j * 4)}] "GET ${path} HTTP/1.1" 404 162 "-" "${userAgents[3]}" 0.002`);
        }

        // Heavy upstream load resulting in 502 / 504
        lines.push(`194.206.12.9 - user_alice [${getNginxTime(i, 12)}] "POST /api/v1/checkout/confirm HTTP/1.1" 504 576 "https://store.company.com/checkout" "${userAgents[0]}" 4.821`);
        lines.push(`90.84.14.21 - user_bob [${getNginxTime(i, 15)}] "GET /api/v1/user/orders HTTP/1.1" 502 524 "https://store.company.com/profile" "${userAgents[1]}" 3.250`);
        lines.push(`198.51.100.42 - - [${getNginxTime(i, 20)}] "POST /api/v1/search HTTP/1.1" 502 524 "-" "${userAgents[4]}" 2.890`);
        lines.push(`82.165.197.1 - user_charlie [${getNginxTime(i, 25)}] "GET /api/v1/recommendations HTTP/1.1" 500 1204 "https://store.company.com/" "${userAgents[0]}" 1.950`);
      }

      return lines.join('\n');
    },
  },
  {
    id: 'syslog-security-bruteforce',
    name: 'Audit Sécurité & Intrusions Syslog',
    badge: 'Sécurité & Auth',
    description: 'Campagne de brute-force SSH automatisée, tentatives de privilèges sudo non autorisées et blocages firewall UFW.',
    format: 'SYSLOG',
    generateRaw: () => {
      const lines: string[] = [];
      const attackers = ['194.26.29.112', '185.196.8.44', '45.148.10.82', '103.145.12.9'];
      const targets = ['root', 'admin', 'deploy', 'ubuntu', 'postgres', 'test'];

      for (let i = 30; i > 0; i--) {
        const ip = attackers[i % attackers.length];
        const user = targets[i % targets.length];
        const port = 42000 + (i * 17);

        lines.push(`${getSyslogTime(i, 0)} srv-edge-01 sshd[${12000 + i}]: Invalid user ${user} from ${ip} port ${port}`);
        lines.push(`${getSyslogTime(i, 2)} srv-edge-01 sshd[${12000 + i}]: Failed password for invalid user ${user} from ${ip} port ${port} ssh2`);
        lines.push(`${getSyslogTime(i, 5)} srv-edge-01 sshd[${12000 + i}]: Connection closed by authenticating user ${user} ${ip} port ${port} [preauth]`);

        if (i % 4 === 0) {
          lines.push(`${getSyslogTime(i, 10)} srv-edge-01 [UFW BLOCK]: IN=eth0 OUT= MAC=52:54:00:12:34:56 SRC=${ip} DST=10.0.0.5 LEN=40 TOS=0x00 PREC=0x00 TTL=242 ID=54321 PROTO=TCP SPT=${port} DPT=22 WINDOW=1024 SYN`);
        }

        if (i % 7 === 0) {
          lines.push(`${getSyslogTime(i, 15)} srv-edge-01 sudo: pam_unix(sudo:auth): authentication failure; logname=uid=1001 euid=0 tty=/dev/pts/2 ruser=appuser rhost= user=appuser`);
          lines.push(`${getSyslogTime(i, 16)} srv-edge-01 sudo: appuser : 3 incorrect password attempts ; TTY=pts/2 ; PWD=/home/appuser ; USER=root ; COMMAND=/usr/bin/cat /etc/shadow`);
        }
      }

      return lines.join('\n');
    },
  },
  {
    id: 'cloud-json-api-gateway',
    name: 'Cloud API Gateway (JSON Structuré)',
    badge: 'Cloud & API',
    description: 'Logs microservices structurés avec traceId, spanId, dépassement de quotas de taux (429) et expiration de jetons JWT.',
    format: 'JSON',
    generateRaw: () => {
      const lines: string[] = [];
      const services = ['auth-service', 'payment-gateway', 'customer-api', 'notification-worker'];

      for (let i = 25; i > 0; i--) {
        const traceId = `tr-${(100000 + i * 73).toString(16)}`;
        const spanId = `sp-${(4000 + i).toString(16)}`;
        const svc = services[i % services.length];

        if (i > 15) {
          // Normal requests
          lines.push(JSON.stringify({
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            level: 'INFO',
            service: svc,
            traceId,
            spanId,
            message: `Handled request successfully on /v1/${svc.replace('-service', '')}`,
            statusCode: 200,
            duration_ms: Math.floor(25 + Math.random() * 80),
            client_ip: '10.244.0.12',
            method: 'GET',
          }));
        } else {
          // Problems arise
          const isRateLimit = i % 2 === 0;
          lines.push(JSON.stringify({
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            level: isRateLimit ? 'WARN' : 'ERROR',
            service: svc,
            traceId,
            spanId,
            message: isRateLimit
              ? `Rate limit threshold exceeded for client organization org_tier_free_${i}`
              : `Token verification failed: JWT signature expired at ${new Date(Date.now() - (i + 5) * 60000).toISOString()}`,
            statusCode: isRateLimit ? 429 : 401,
            duration_ms: isRateLimit ? 12 : 28,
            client_ip: `198.51.100.${i + 10}`,
            method: 'POST',
            error: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'AUTH_TOKEN_EXPIRED',
            path: `/v1/oauth/verify`,
          }));

          if (i % 3 === 0) {
            lines.push(JSON.stringify({
              timestamp: new Date(Date.now() - i * 60000 + 1500).toISOString(),
              level: 'FATAL',
              service: 'payment-gateway',
              traceId,
              spanId,
              message: 'Dead letter queue threshold breached for async-payout-topic. 150 failed jobs.',
              statusCode: 500,
              duration_ms: 4500,
              error: 'RABBITMQ_NACK_THRESHOLD_EXCEEDED',
              stack: 'com.rabbitmq.client.ShutdownSignalException: connection error; protocol method: #method<connection.close>(reply-code=320, reply-text=CONNECTION_FORCED)',
            }));
          }
        }
      }

      return lines.join('\n');
    },
  },
];

export function getInitialDemoLogs(): LogEntry[] {
  const defaultScenario = DEMO_DATASETS[0];
  return parseLogContent(defaultScenario.generateRaw(), defaultScenario.format);
}
