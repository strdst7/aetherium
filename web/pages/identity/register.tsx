import { Layout } from '../../components/Layout';
import { IdentityForm } from '../../components/IdentityForm';

export default function IdentityRegisterPage() {
  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2em', color: '#2c3e50', marginBottom: '8px' }}>
          Register Sigil Identity
        </h1>
        <p style={{ color: '#7f8c8d', marginBottom: '24px' }}>
          Define a new identity with voice, constraints, and behavioral boundaries.
        </p>

        <IdentityForm
          onSuccess={(identity) => {
            console.log('Identity created:', identity);
          }}
        />

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #ecf0f1' }}>
          <a
            href="/"
            style={{
              color: '#3498db',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ← Back to Identity Test
          </a>
        </div>
      </div>
    </Layout>
  );
}
