import CountUp from './CountUp';

const StreamsDisplay = ({ value }) => {
  return (
    <div
      style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1F2937',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        letterSpacing: '-0.02em', // Tighter spacing for numbers
        lineHeight: 1.2,
      }}
    >
      <CountUp to={value} from={0} duration={1.5} separator="," />
    </div>
  );
};

export default StreamsDisplay;
