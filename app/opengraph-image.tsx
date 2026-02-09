import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Solana Programs Directory';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
            boxShadow: '0 20px 40px rgba(153, 69, 255, 0.3)',
          }}
        >
          <span style={{ fontSize: '64px', color: 'white', fontWeight: 'bold' }}>S</span>
        </div>
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          Solana Programs
        </h1>
        <p
          style={{
            fontSize: '36px',
            color: '#a0a0a0',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Discover 1,014+ onchain programs
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
