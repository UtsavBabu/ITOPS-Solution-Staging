-- Microsoft Azure Fundamentals: the first cloud-provider-specific Academy
-- course, building on Cloud Computing Essentials' generic IaaS/PaaS/SaaS and
-- shared-responsibility concepts with Azure's actual organizational model
-- (management groups/subscriptions/resource groups/ARM), identity (Microsoft
-- Entra ID + RBAC), and core services — same real shape as every other
-- course: modules, lessons with a comprehension check, a real graded quiz.

insert into cybersachet_courses (slug, title, description, level, estimated_minutes, published, sort_order, category, min_plan, free_tier, track) values
  ('microsoft-azure-fundamentals', 'Microsoft Azure Fundamentals', 'How Azure actually organizes resources and identity — management groups, subscriptions, resource groups, and role-based access control — plus the core services (VMs, App Service, storage, virtual networks) every Azure workload is built from.', 'intermediate', 20, true, 106, 'cloud', 'PROFESSIONAL', false, 'academy')
on conflict (slug) do nothing;

do $$
declare
  v_course_id uuid;
  v_m1 uuid;
  v_m2 uuid;
begin
  select id into v_course_id from cybersachet_courses where slug = 'microsoft-azure-fundamentals';
  if not exists (select 1 from cybersachet_modules where course_id = v_course_id) then
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Azure Structure & Identity', 0) returning id into v_m1;
  insert into cybersachet_modules (course_id, title, sort_order) values (v_course_id, 'Core Azure Services', 1) returning id into v_m2;

  insert into cybersachet_lessons (course_id, module_id, title, body, key_takeaway, sort_order, check_question, check_choices, check_correct_index) values
  (v_course_id, v_m1, 'Subscriptions, resource groups, and Azure Resource Manager',
   E'Azure organizes everything under a hierarchy: management groups (optional, for applying policy across many subscriptions at once) contain subscriptions (the billing and access-control boundary), which contain resource groups (a logical container for resources that share a lifecycle — you typically delete a resource group to delete everything inside it together). Every operation in Azure, whether from the Portal, CLI, PowerShell, or an ARM/Bicep template, goes through Azure Resource Manager (ARM), the single control-plane API that authenticates the request, checks RBAC permissions, and routes it to the right resource provider. This is why infrastructure-as-code in Azure (ARM templates, Bicep, or Terraform''s azurerm provider) all produce identical results — they''re just different syntaxes for the same underlying ARM API calls.',
   'A resource group is a lifecycle boundary — deleting it deletes everything inside it together, which is why deployments are usually scoped to one.', 0,
   'What happens when you delete a resource group in Azure?', '["Only the resource group''s tags are removed", "Every resource inside it is deleted along with it", "Resources are moved to a default group", "Nothing, resource groups are permanent"]'::jsonb, 1),
  (v_course_id, v_m1, 'Microsoft Entra ID and role-based access control',
   E'Microsoft Entra ID (formerly Azure Active Directory) is Azure''s identity service — every user, service principal (an application''s own identity), and managed identity (an identity Azure automatically manages for a resource, so you never handle its credentials directly) authenticates through it. Access to actually do things with resources is governed separately by Azure RBAC: a role assignment binds a security principal (a user, group, or service principal) to a role definition (like Reader, Contributor, or Owner, or a custom role) at a scope (a management group, subscription, resource group, or single resource). RBAC is additive only — you grant permissions, you can''t explicitly deny them the way a firewall rule blocks traffic — and permissions granted at a higher scope always inherit down to everything beneath it. Least privilege means picking the narrowest role at the narrowest scope that still lets someone do their job — Contributor on one resource group instead of Owner on the whole subscription.',
   'RBAC in Azure is additive only, and permissions granted at a higher scope automatically inherit down.', 1,
   'A user is granted Contributor at the subscription level. What does that mean for a specific resource group underneath it?', '["They get no access unless granted separately", "They inherit Contributor access there too", "They only get Reader access there", "Subscription-level roles don''t inherit"]'::jsonb, 1),
  (v_course_id, v_m2, 'Compute: VMs, scale sets, and App Service',
   E'An Azure Virtual Machine is IaaS — you pick a size (which fixes its vCPU/RAM/disk throughput), an OS image, and you''re responsible for patching and managing everything above the hypervisor, the same as EC2 on AWS. A Virtual Machine Scale Set (VMSS) manages a group of identical VMs as one unit, automatically adding or removing instances based on an autoscale rule (like CPU percentage) — the same pattern as an AWS Auto Scaling Group. Azure App Service is PaaS: you deploy code (a container, or directly from a Git repo) and Azure handles the OS, runtime patching, and the scaling settings you configure — no VM to manage at all. Choosing between them mostly comes down to how much control you actually need: App Service for a standard web app or API, VMs/VMSS when you need OS-level control or software that doesn''t fit a PaaS runtime.',
   'App Service trades VM-level control for zero OS management — the same IaaS-vs-PaaS tradeoff as any cloud provider, just with Azure''s own names for it.', 0,
   'What is the main difference between a VM Scale Set and Azure App Service?', '["They are identical services", "A VMSS manages a group of full VMs you still patch yourself; App Service is PaaS with no OS to manage", "App Service only runs static websites", "VMSS is only for databases"]'::jsonb, 1),
  (v_course_id, v_m2, 'Storage, virtual networks, and keeping costs in check',
   E'Azure Storage accounts hold multiple types side by side: Blob storage (unstructured files over HTTP/HTTPS, like AWS S3), Azure Files (a fully managed SMB/NFS file share you can mount like a network drive), and managed Disks (block storage attached to a single VM). A Virtual Network (VNet) is your own isolated network in Azure, split into subnets; a Network Security Group (NSG) is a set of allow/deny rules, by source/destination IP, port, and protocol, attached to a subnet or network interface, functioning as Azure''s stateful firewall layer. Azure Monitor collects metrics and logs across all of this, and Cost Management (Cost Analysis plus budgets with alerts) is the tool for catching a runaway bill before the invoice arrives — a budget alert firing on an unexpected spike is usually the first sign a VM was left running, or a scale set''s autoscale rule was misconfigured.',
   'An NSG''s allow/deny rules by IP/port/protocol are Azure''s core firewall layer — most "can''t connect" issues on a VNet trace back to one.', 1,
   'What does a Network Security Group (NSG) control in Azure?', '["Billing alerts", "Allow/deny traffic rules by IP, port, and protocol for a subnet or NIC", "Which OS a VM runs", "Storage account replication settings"]'::jsonb, 1)
  on conflict do nothing;

  insert into cybersachet_quiz_questions (course_id, question, choices, question_type, correct_index, sort_order) values
  (v_course_id, 'What is the correct order of Azure''s organizational hierarchy, from broadest to narrowest?', '["Resource group > subscription > management group", "Management group > subscription > resource group", "Subscription > management group > resource group", "They have no hierarchy"]'::jsonb, 'single', 1, 0),
  (v_course_id, 'Azure RBAC role assignments work by:', '["Explicitly denying specific users", "Granting a role to a principal at a scope, which is additive and inherits downward", "Blocking all access by default with no way to grant it", "Only applying to a single resource, never a resource group"]'::jsonb, 'single', 1, 1),
  (v_course_id, 'You need to run a legacy application that requires specific OS-level configuration Azure App Service doesn''t support. What''s the right compute choice?', '["Azure App Service anyway", "A Virtual Machine", "Cost Management", "Microsoft Entra ID"]'::jsonb, 'single', 1, 2),
  (v_course_id, 'What is the primary purpose of Azure Cost Management budgets and alerts?', '["To automatically delete unused resources", "To catch unexpected spending before the invoice arrives", "To enforce RBAC roles", "To configure NSG rules"]'::jsonb, 'single', 1, 3)
  on conflict do nothing;
  end if;
end $$;
