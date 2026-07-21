// Real, technically-accurate interactive architecture diagrams — keyed by
// lesson title (same convention as data/terminalDemos.js), so one entry
// covers both the real DB-seeded lesson and its local-preview twin.
//
// Every node's detail is drawn directly from the same real material already
// taught in these courses (see supabase/migrations 0078/0080/0085) — this is
// a visual, clickable restatement of real content, never invented facts.
//
// Shape:
//   layout: "chain" | "grid"
//   nodes: [{ id, label, icon, summary, detail: { purpose, configuration, bestPractice, commonMistake }, children?: [...] }]
// `children` (chain layout only) renders as an indented sub-row revealed
// when its parent node is clicked, for a component with real internal parts
// (Control Plane -> API Server/Scheduler/Controller Manager/etcd).

export const DIAGRAM_DEMOS = {
  "Containers vs. virtual machines": {
    layout: "chain",
    caption: "Click a layer to see what it actually does",
    nodes: [
      { id: "app", icon: "▣", label: "Application", summary: "Your code and its direct runtime dependencies.",
        detail: { purpose: "This is what you're actually shipping — a container image mostly exists to package this layer consistently across every environment it runs in." } },
      { id: "image", icon: "▤", label: "Docker Image", summary: "A read-only, layered template built from a Dockerfile.",
        detail: { purpose: "Images are the distributable, versioned artifact. The same image runs identically on a laptop, a CI runner, or a production server — that portability is the whole point." } },
      { id: "runtime", icon: "▥", label: "Container Runtime", summary: "The engine (containerd, runc) that starts a container from an image.",
        detail: { purpose: "Creates the isolated namespaces — filesystem, network, processes — that keep containers separated on the same host, without needing a separate OS per container." } },
      { id: "kernel", icon: "▦", label: "Host OS Kernel", summary: "The single Linux kernel every container on this machine shares.",
        detail: { purpose: "Shared kernel is exactly why containers start in seconds instead of minutes — there's no OS to boot, just a new set of namespaces on an already-running kernel.",
          commonMistake: "Assuming a Linux container can run directly on a Windows host's kernel — Docker Desktop quietly runs a small Linux VM underneath to provide one." } },
      { id: "infra", icon: "▧", label: "Infrastructure", summary: "The physical or virtual machine the host OS actually runs on.",
        detail: { purpose: "Scaling containers is really just scaling how much of this layer is available — more infrastructure, more room to run containers." } }
    ]
  },
  "Pods, Deployments, and the Kubernetes API": {
    layout: "chain",
    caption: "Click a layer — Control Plane and Nodes expand into their real components",
    nodes: [
      { id: "cluster", icon: "◈", label: "Cluster", summary: "One or more control planes managing a set of worker nodes.",
        detail: { purpose: "Everything below is what makes up \"a cluster\" — you talk to it as one thing via the Kubernetes API, never to an individual node directly." } },
      { id: "control-plane", icon: "◆", label: "Control Plane", summary: "The brain of the cluster — decides what should run where.",
        detail: { purpose: "Continuously reconciles reality toward the desired state you described (e.g. \"3 replicas of this container\")." },
        children: [
          { id: "api-server", label: "API Server", detail: {
            purpose: "The single front door for every request — kubectl, the dashboard, every other component — all go through it; nothing talks to etcd or a node directly.",
            configuration: "Runs as kube-apiserver; every request is authenticated, then checked against RBAC before anything happens.",
            bestPractice: "Never expose the API server directly to the public internet without strict network rules in front of it.",
            commonMistake: "Assuming kubectl talks directly to nodes — it always goes through the API server first."
          } },
          { id: "scheduler", label: "Scheduler", detail: {
            purpose: "Watches for Pods with no node assigned yet and picks the best-fit node based on resource requests, taints/tolerations, and affinity rules.",
            configuration: "Runs as kube-scheduler; placement can be influenced with resource requests/limits and node affinity in the Pod spec.",
            bestPractice: "Set realistic resource requests — the scheduler can only make good placement decisions if they reflect what the Pod actually needs.",
            commonMistake: "Leaving resource requests unset, which lets the scheduler over-pack a node and cause CPU/memory contention."
          } },
          { id: "controller-manager", label: "Controller Manager", detail: {
            purpose: "Runs the reconciliation loops — the Deployment controller, ReplicaSet controller, and others — that continuously push actual state toward desired state.",
            configuration: "Runs as kube-controller-manager, bundling many individual controllers into one process.",
            bestPractice: "Trust the reconciliation loop — edit the Deployment and let the controller recreate Pods correctly, rather than doing it by hand.",
            commonMistake: "Manually deleting Pods to \"fix\" a Deployment instead of fixing the Deployment/image and letting the controller handle it."
          } },
          { id: "etcd", label: "etcd", detail: {
            purpose: "The cluster's single source of truth — every object (Deployments, Services, Secrets, everything) is stored here as key-value data.",
            configuration: "Typically run as a 3- or 5-node cluster for its own high availability, since losing etcd means losing the cluster's entire state.",
            bestPractice: "Back up etcd regularly and treat it as the most critical piece of infrastructure in the cluster.",
            commonMistake: "Running a single-node etcd in production — one disk failure from losing every object in the cluster."
          } }
        ] },
      { id: "nodes", icon: "◆", label: "Nodes", summary: "The worker machines that actually run your containers.",
        detail: { purpose: "Each node runs an agent that takes orders from the control plane and reports back the real state of what's running." },
        children: [
          { id: "kubelet", label: "Kubelet", detail: {
            purpose: "The agent on every node that talks to the API server and makes sure the containers described for this node are actually running.",
            configuration: "Runs as a systemd service on each node; reads the Pod specs assigned to it and starts/stops containers via the container runtime.",
            bestPractice: "Check kubelet logs/status directly on a node when a Pod won't start even though scheduling succeeded.",
            commonMistake: "Only checking `kubectl describe pod` and never the node's own kubelet logs when a Pod is stuck in ContainerCreating."
          } },
          { id: "kube-proxy", label: "kube-proxy", detail: {
            purpose: "Maintains the network rules on each node that make Service IPs actually route to the right Pods.",
            configuration: "Runs on every node, programming iptables or IPVS rules from the cluster's Service/Endpoint objects.",
            bestPractice: "If a Service isn't routing correctly, check kube-proxy's rules on the node before assuming the application itself is broken.",
            commonMistake: "Debugging \"Service unreachable\" purely at the application layer, missing that it's actually a networking/kube-proxy issue."
          } },
          { id: "node-runtime", label: "Container Runtime", detail: {
            purpose: "The same kind of engine from the Docker layer diagram — actually starts and stops containers on this node when kubelet tells it to.",
            configuration: "Configured cluster-wide, but running independently on every node.",
            bestPractice: "Keep the container runtime version consistent across all nodes to avoid subtle differences depending on where a Pod lands.",
            commonMistake: "Mixing container runtime versions across nodes in the same cluster."
          } }
        ] },
      { id: "pods", icon: "◇", label: "Pods", summary: "One or more containers scheduled together on the same node.",
        detail: { purpose: "The smallest unit Kubernetes schedules — you deploy Pods through a Deployment, not raw containers directly.",
          commonMistake: "Creating a bare Pod directly instead of through a Deployment — a bare Pod that dies is never recreated." } },
      { id: "containers", icon: "○", label: "Containers", summary: "The actual running processes — your application.",
        detail: { purpose: "This is where your application code actually executes — everything above this exists to get it scheduled, networked, and kept running reliably." } }
    ]
  },
  "Subscriptions, resource groups, and Azure Resource Manager": {
    layout: "chain",
    caption: "Click a level of the hierarchy",
    nodes: [
      { id: "mgmt-group", icon: "◈", label: "Management Group", summary: "Optional top tier for governing many subscriptions at once.",
        detail: { purpose: "Applies Azure Policy and RBAC across many subscriptions at once — useful once an organization has more than a handful of them.",
          commonMistake: "Adding this layer before you actually have multiple subscriptions to govern together — at small scale, skip it." } },
      { id: "subscription", icon: "◆", label: "Subscription", summary: "The billing and access-control boundary.",
        detail: { purpose: "The top-level scope most RBAC and cost-management decisions are actually made at.",
          bestPractice: "Separate subscriptions by environment (production vs. non-production) or business unit — it's the natural blast-radius boundary." } },
      { id: "resource-group", icon: "◇", label: "Resource Group", summary: "A lifecycle container for resources deployed together.",
        detail: { purpose: "Delete the group, delete everything inside it together — this is Azure's lifecycle boundary.",
          bestPractice: "Group resources that get deployed and torn down together, like everything for one application's environment.",
          commonMistake: "Dumping every resource into one giant resource group regardless of lifecycle, making cleanup and blast-radius control much harder." } },
      { id: "resources", icon: "○", label: "Resources", summary: "The actual VMs, storage accounts, VNets, and everything else.",
        detail: { purpose: "Every one of these is created, read, updated, or deleted through Azure Resource Manager (ARM), regardless of whether you used the Portal, CLI, or an ARM/Bicep template." } }
    ]
  },
  "Storage, virtual networks, and keeping costs in check": {
    layout: "grid",
    caption: "Click a service to see how it's actually configured",
    nodes: [
      { id: "vm", icon: "▣", label: "Virtual Machine", summary: "IaaS compute — a size, an OS image, a VNet.",
        detail: { purpose: "IaaS compute you patch and manage yourself, the same tradeoff covered in the compute lesson.",
          configuration: "Choose a size, an OS image, and a virtual network to attach it to.",
          bestPractice: "Right-size the VM to the workload — an oversized VM running 24/7 is usually the single biggest lever in a cost review.",
          commonMistake: "Leaving a dev/test VM running around the clock instead of stopping it outside work hours." } },
      { id: "vnet", icon: "▥", label: "Virtual Network", summary: "Your isolated network, split into subnets.",
        detail: { purpose: "An isolated network within a region, split into subnets you control.",
          configuration: "Define an address space and subnets, then attach NSGs to control traffic between them.",
          bestPractice: "Segment subnets by tier — web, app, data — so an NSG can enforce rules between them, not just at the edge.",
          commonMistake: "One flat subnet for everything, so a single compromised VM has a clear path to every other resource." } },
      { id: "nsg", icon: "▦", label: "Network Security Group", summary: "Allow/deny rules by IP, port, protocol.",
        detail: { purpose: "Azure's core firewall layer, attached to a subnet or network interface.",
          configuration: "Rules are evaluated by priority number, lowest first — the first matching rule wins.",
          bestPractice: "Deny by default, then explicitly allow only the ports actually needed.",
          commonMistake: "Leaving RDP (3389) or SSH (22) open to the entire internet instead of a known IP range." } },
      { id: "storage", icon: "▤", label: "Storage Account", summary: "Blob, Files, and managed Disks.",
        detail: { purpose: "Holds Blob storage (files over HTTP), Azure Files (a managed SMB/NFS share), and Disks (block storage for a VM).",
          configuration: "Choose a redundancy level — LRS, ZRS, GRS — based on how much data-loss risk is acceptable.",
          bestPractice: "Enable soft delete and versioning on Blob storage so an accidental delete or overwrite isn't unrecoverable.",
          commonMistake: "Leaving a Blob container set to public access when it holds anything sensitive." } },
      { id: "entra", icon: "◈", label: "Microsoft Entra ID / RBAC", summary: "Identity and access control.",
        detail: { purpose: "Governs who and what can do anything to these resources at all, covered in the identity lesson.",
          configuration: "Assign roles at the narrowest scope that still does the job.",
          bestPractice: "Assign roles to groups instead of individual users, so access changes when group membership changes, not through manual re-assignment.",
          commonMistake: "Granting Owner at the subscription level for a task that only needed Contributor on one resource group." } },
      { id: "cost", icon: "◆", label: "Cost Management", summary: "Budgets and alerts before the invoice arrives.",
        detail: { purpose: "Catches a runaway bill early instead of finding out at invoice time.",
          configuration: "Set a budget per subscription or resource group with an alert threshold, e.g. 80% of budget.",
          bestPractice: "Tag resources by team/project so Cost Analysis can actually attribute spend to the right owner.",
          commonMistake: "Setting up Cost Management after a surprise bill instead of before one." } }
    ]
  }
};
