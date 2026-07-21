// Simulated terminal demos for the lesson reader — real, technically
// accurate command output written by hand for each command actually taught
// in the lesson body, not live execution. Every demo is rendered inside a
// component labeled "Simulated output" so it never reads as a live shell —
// this is a worked example to study, the same honest convention as a
// textbook's "example session" block, not a claim of real remote access.
//
// Keyed by lesson TITLE rather than lesson id — the same title exists on
// both the real DB-seeded lesson (migrations 0073/0078) and its local-
// preview twin (data/cybersachetCourses.js), which have different ids, so
// this one map covers both without duplication.

export const TERMINAL_DEMOS = {
  "The filesystem layout": [
    { command: "ls /var/log", output: "auth.log   boot.log   dpkg.log   kern.log   nginx/   syslog   syslog.1   ufw.log" },
    { command: "ls /etc | head -5", output: "apt/\ncron.d/\ndefault/\nfstab\nhostname" }
  ],
  "Navigating and reading files from the shell": [
    { command: "pwd", output: "/home/alice/projects/api-service" },
    { command: "ls -la", output: "drwxr-xr-x 6 alice alice 4096 Mar  3 10:12 .\ndrwxr-xr-x 9 alice alice 4096 Mar  1 08:40 ..\n-rw-r--r-- 1 alice alice  312 Mar  3 09:58 .env\ndrwxr-xr-x 8 alice alice 4096 Mar  3 10:05 .git\n-rw-r--r-- 1 alice alice 1847 Feb 27 14:22 README.md\ndrwxr-xr-x 4 alice alice 4096 Mar  2 16:10 src" },
    { command: "tail -n 4 /var/log/syslog", output: "Mar  3 10:41:02 web01 systemd[1]: Started Daily apt download activities.\nMar  3 10:41:04 web01 CRON[8821]: (root) CMD (test -x /usr/sbin/anacron)\nMar  3 10:42:17 web01 sshd[8830]: Accepted publickey for alice from 10.0.4.12\nMar  3 10:42:17 web01 sshd[8830]: pam_unix(sshd:session): session opened for user alice" }
  ],
  "File permissions and ownership": [
    { command: "ls -l deploy.sh", output: "-rwxr-xr-- 1 alice devs 842 Mar  3 09:12 deploy.sh" },
    { command: "chmod 755 deploy.sh && ls -l deploy.sh", output: "-rwxr-xr-x 1 alice devs 842 Mar  3 09:12 deploy.sh" },
    { command: "chown alice:devs deploy.sh", output: "" }
  ],
  "Processes, services, and package managers": [
    { command: "systemctl status nginx", output: "● nginx.service - A high performance web server\n     Loaded: loaded (/lib/systemd/system/nginx.service; enabled)\n     Active: active (running) since Mon 2026-03-03 08:14:02 UTC; 2h 6min ago\n   Main PID: 1421 (nginx)\n      Tasks: 3 (limit: 4665)\n     Memory: 6.4M" },
    { command: "sudo systemctl restart nginx", output: "" },
    { command: "apt install curl", output: "Reading package lists... Done\nBuilding dependency tree... Done\nThe following NEW packages will be installed:\n  curl\n0 upgraded, 1 newly installed, 0 to remove.\nSetting up curl (7.88.1-10) ..." }
  ],
  "IP addresses and subnets": [
    { command: "ip addr show eth0", output: "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet 192.168.1.42/24 brd 192.168.1.255 scope global eth0\n       valid_lft forever preferred_lft forever" }
  ],
  "DNS: how names become IP addresses": [
    { command: "dig +short example.com", output: "23.215.0.138" },
    { command: "dig +short example.com | xargs -I{} whois {} | head -3", output: "NetRange:       23.192.0.0 - 23.223.255.255\nCIDR:           23.192.0.0/11\nOrganization:   Akamai Technologies" }
  ],
  "Ports and common protocols": [
    { command: "ss -tulpn", output: "Netid  State   Local Address:Port   Process\ntcp    LISTEN  0.0.0.0:22            sshd\ntcp    LISTEN  0.0.0.0:80            nginx\ntcp    LISTEN  0.0.0.0:443           nginx" }
  ],
  "Troubleshooting connectivity from the command line": [
    { command: "ping -c 3 api.example.com", output: "64 bytes from 23.215.0.138: icmp_seq=1 ttl=54 time=11.2 ms\n64 bytes from 23.215.0.138: icmp_seq=2 ttl=54 time=10.8 ms\n64 bytes from 23.215.0.138: icmp_seq=3 ttl=54 time=11.5 ms\n\n--- api.example.com ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss" },
    { command: "traceroute api.example.com", output: " 1  gateway (192.168.1.1)  1.1 ms\n 2  10.10.0.1  4.3 ms\n 3  isp-core-router.net (203.0.113.9)  9.8 ms\n 4  23.215.0.138  11.4 ms" },
    { command: "curl -I https://api.example.com", output: "HTTP/2 200\ncontent-type: application/json\ncache-control: no-store\ndate: Tue, 03 Mar 2026 10:52:11 GMT" }
  ],
  "Containers vs. virtual machines": [
    { command: "docker info --format '{{.OperatingSystem}} / {{.KernelVersion}}'", output: "Ubuntu 22.04.3 LTS / 6.2.0-39-generic" }
  ],
  "Images, containers, and the Dockerfile": [
    { command: "docker build -t myapp .", output: "[+] Building 4.2s (9/9) FINISHED\n => [1/4] FROM node:20\n => [2/4] WORKDIR /app\n => [3/4] COPY package.json .\n => [4/4] RUN npm install\n => exporting to image\n => => naming to docker.io/library/myapp" }
  ],
  "Core Docker commands": [
    { command: "docker run -d -p 8080:80 myapp", output: "a1f9c3e7d2b4" },
    { command: "docker ps", output: "CONTAINER ID   IMAGE    STATUS         PORTS                  NAMES\na1f9c3e7d2b4   myapp    Up 8 seconds   0.0.0.0:8080->80/tcp   nifty_hopper" },
    { command: "docker logs a1f9c3e7d2b4", output: "Server listening on port 80\nConnected to database\nReady to accept connections" }
  ],
  "Volumes, networking, and docker-compose": [
    { command: "docker compose up -d", output: "[+] Running 3/3\n ✔ Network myapp_default    Created\n ✔ Container myapp-db-1     Started\n ✔ Container myapp-web-1    Started" },
    { command: "docker volume ls", output: "DRIVER    VOLUME NAME\nlocal     myapp_dbdata" }
  ],
  "Version control as the foundation": [
    { command: "git status", output: "On branch feature/rate-limit\nChanges not staged for commit:\n  modified:   src/middleware/throttle.js\n\nno changes added to commit" },
    { command: "git log --oneline -3", output: "a3f9d21 Add per-IP rate limit middleware\n7c81e04 Bump express to 4.19.2\n0e4b7aa Fix flaky auth test" }
  ],
  "Continuous Integration: build and test automatically": [
    { command: "npm test", output: "PASS  src/middleware/throttle.test.js\nPASS  src/routes/health.test.js\n\nTest Suites: 2 passed, 2 total\nTests:       14 passed, 14 total" }
  ]
};
