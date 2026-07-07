import tls from "node:tls";

export interface SslCheckResult {
  isValid: boolean;
  issuer?: string;
  subject?: string;
  validFrom?: Date;
  validTo?: Date;
  daysRemaining?: number;
  protocol?: string;
  errorMessage?: string;
}

export function runSslCheck(targetUrl: string, timeoutMs: number): Promise<SslCheckResult> {
  return new Promise((resolve) => {
    let hostname: string;
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "https:") {
        resolve({ isValid: false, errorMessage: "Not an HTTPS URL" });
        return;
      }
      hostname = parsed.hostname;
    } catch {
      resolve({ isValid: false, errorMessage: "Invalid URL" });
      return;
    }

    let settled = false;
    const finish = (result: SslCheckResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, timeout: timeoutMs, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        const protocol = socket.getProtocol() ?? undefined;

        if (!cert || Object.keys(cert).length === 0) {
          socket.end();
          finish({ isValid: false, errorMessage: "No certificate returned by server" });
          return;
        }

        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        socket.end();
        finish({
          isValid: socket.authorized,
          issuer: cert.issuer ? Object.values(cert.issuer).join(", ") : undefined,
          subject: cert.subject ? Object.values(cert.subject).join(", ") : undefined,
          validFrom,
          validTo,
          daysRemaining,
          protocol,
          errorMessage: socket.authorized ? undefined : socket.authorizationError?.toString(),
        });
      },
    );

    socket.on("error", (err) => finish({ isValid: false, errorMessage: err.message }));
    socket.on("timeout", () => {
      socket.destroy();
      finish({ isValid: false, errorMessage: "SSL connection timed out" });
    });
  });
}
