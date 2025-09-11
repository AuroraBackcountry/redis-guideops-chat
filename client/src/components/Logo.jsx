import guideOpsLogo from '../assets/guideops-logo.png';

const Logo = ({ width = 96, height = 96 }) => {
  return (
    <img 
      src={guideOpsLogo}
      alt="GuideOps"
      width={width}
      height={height}
      style={{ 
        objectFit: 'contain',
        maxWidth: '100%',
        maxHeight: '100%'
      }}
    />
  );
};

export default Logo;
