-- Cover the last 8 FK indexes the advisor flagged
create index if not exists idx_audit_logs_actor_id              on public.audit_logs(actor_id);
create index if not exists idx_financial_transactions_processed_by on public.financial_transactions(processed_by);
create index if not exists idx_import_batches_imported_by        on public.import_batches(imported_by);
create index if not exists idx_pod_artifacts_courier_id          on public.pod_artifacts(courier_id);
create index if not exists idx_settlement_requests_requested_by  on public.settlement_requests(requested_by);
create index if not exists idx_settlement_requests_reviewed_by   on public.settlement_requests(reviewed_by);
create index if not exists idx_shipment_status_logs_changed_by   on public.shipment_status_logs(changed_by);
create index if not exists idx_shipment_status_logs_courier_id   on public.shipment_status_logs(courier_id);
