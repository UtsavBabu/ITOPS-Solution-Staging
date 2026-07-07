import type { WaitlistProduct } from "../api/types";

export interface SolutionCapability {
  title: string;
  detail: string;
  status: "live" | "roadmap";
}

export interface Solution {
  slug: string;
  name: string;
  tagline: string;
  status: "live" | "roadmap";
  summary: string;
  capabilities: SolutionCapability[];
  waitlistProduct?: WaitlistProduct;
}

export const SOLUTIONS: Solution[] = [
  {
    slug: "website-api-monitoring",
    name: "Website & API Monitoring",
    tagline: "Know the moment a site or endpoint goes down",
    status: "live",
    summary:
      "Continuous HTTP/HTTPS checks against every website or API endpoint you add, with response time history, redirect-chain tracing, and automatic incident tracking — live today, not a demo.",
    capabilities: [
      { title: "HTTP & HTTPS uptime checks", detail: "Checks on a schedule from 30 seconds to 15 minutes, per monitor.", status: "live" },
      { title: "Redirect chain tracing", detail: "Follows up to 5 redirects and records the full chain for every check.", status: "live" },
      { title: "Response time history", detail: "Every check is stored, powering the response-time chart on each monitor.", status: "live" },
      { title: "Automatic incident tracking", detail: "Opens an incident after consecutive failures, auto-resolves on recovery.", status: "live" },
      { title: "Multi-channel alerting", detail: "Slack, webhook, and email notifications the moment a monitor goes down.", status: "live" },
      { title: "DNS, TCP, UDP & ping checks", detail: "Protocol-level checks beyond HTTP, for full network reachability.", status: "roadmap" },
      { title: "GraphQL-aware checks", detail: "Query-based synthetic checks against GraphQL APIs.", status: "roadmap" },
      { title: "Regional & global checks", detail: "Run checks from multiple regions to catch geography-specific outages.", status: "roadmap" },
      { title: "Public status pages", detail: "A hosted status page you can share with customers.", status: "roadmap" },
      { title: "SLA reports", detail: "Scheduled uptime & SLA compliance reports per monitor.", status: "roadmap" },
    ],
  },
  {
    slug: "security-monitoring",
    name: "Security Monitoring",
    tagline: "A real security score for every endpoint",
    status: "live",
    summary:
      "SSL certificate and HTTP security-header analysis run automatically alongside your uptime checks, scoring every site out of 100 and flagging exactly what's missing.",
    capabilities: [
      { title: "SSL certificate expiry tracking", detail: "Issuer, protocol, and days-remaining, checked daily per monitor.", status: "live" },
      { title: "Security header scoring", detail: "HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.", status: "live" },
      { title: "Cookie security analysis", detail: "Flags cookies missing Secure, HttpOnly, or SameSite attributes.", status: "live" },
      { title: "Server version leak detection", detail: "Flags a server header that discloses a specific software version.", status: "live" },
      { title: "Expiry alerts", detail: "Automatic alerts when a certificate is within 14 days of expiring, or already expired.", status: "live" },
      { title: "Certificate chain analysis", detail: "Full chain validation against trusted root authorities.", status: "roadmap" },
      { title: "Weak cipher & TLS grade", detail: "A/B/C/D/F grading based on supported protocols and cipher suites.", status: "roadmap" },
      { title: "Open port detection", detail: "Flag unexpected internet-facing ports.", status: "roadmap" },
      { title: "Compliance benchmarking", detail: "Benchmark security posture against CIS and industry baselines.", status: "roadmap" },
      { title: "Endpoint configuration drift", detail: "Detect endpoint security settings drifting out of policy.", status: "roadmap" },
    ],
  },
  {
    slug: "infrastructure-monitor",
    name: "ITOps Infrastructure Monitor",
    tagline: "One view across every server you run",
    status: "roadmap",
    summary:
      "A lightweight agent for Linux and Windows servers, VMware, and Hyper-V — reporting CPU, memory, disk, processes, and service health into the same dashboard as your website monitors. This is on our roadmap, not shipped yet.",
    waitlistProduct: "infrastructure-monitor",
    capabilities: [
      { title: "Linux & Windows servers", detail: "Agent-based monitoring for physical and virtual servers.", status: "roadmap" },
      { title: "VMware & Hyper-V", detail: "Hypervisor-level visibility across your virtualization estate.", status: "roadmap" },
      { title: "Network devices & storage", detail: "Switches, routers, and storage arrays via SNMP.", status: "roadmap" },
      { title: "Cloud infrastructure", detail: "AWS, Azure, and GCP compute resources alongside on-prem servers.", status: "roadmap" },
      { title: "CPU, memory & disk", detail: "Real-time resource utilization with historical trends.", status: "roadmap" },
      { title: "Processes & services", detail: "Track critical services and flag unexpected process behavior.", status: "roadmap" },
      { title: "Performance & availability", detail: "The same incident and alerting engine that powers website monitoring today.", status: "roadmap" },
    ],
  },
  {
    slug: "devops-monitor",
    name: "DevOps Monitor",
    tagline: "Visibility into your deployment pipeline",
    status: "roadmap",
    summary:
      "Monitoring for the tools your engineering team actually runs — containers, orchestration, CI/CD, and infrastructure-as-code. This is on our roadmap, not shipped yet.",
    waitlistProduct: "devops-monitor",
    capabilities: [
      { title: "Docker & Kubernetes", detail: "Container, pod, and cluster health in one place.", status: "roadmap" },
      { title: "CI/CD pipelines", detail: "GitHub Actions, GitLab CI/CD, and Jenkins build & deploy status.", status: "roadmap" },
      { title: "Infrastructure as code", detail: "Terraform and Ansible run status and drift detection.", status: "roadmap" },
      { title: "Observability integrations", detail: "Pull metrics from Prometheus and Grafana into the same dashboard.", status: "roadmap" },
      { title: "Deployment tracking", detail: "Correlate incidents with recent deployments.", status: "roadmap" },
      { title: "Application health & logs", detail: "Centralized application health signals and log access.", status: "roadmap" },
    ],
  },
];

export function getSolution(slug: string | undefined): Solution | undefined {
  return SOLUTIONS.find((s) => s.slug === slug);
}
