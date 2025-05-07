
import { Layout } from '@/components/layout/Layout';
import { LeadList } from '@/components/leads/LeadList';
import { useCRM } from '@/context/CRMContext';

export default function Leads() {
  return (
    <Layout>
      <LeadList />
    </Layout>
  );
}
