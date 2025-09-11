// Import the GuideOps logo
import guideOpsLogo from '../../assets/guideops-logo.png';

export const CompanyLogo = () => (
  <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <img src={guideOpsLogo} alt="GuideOps" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
  </div>
);