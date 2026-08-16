import composingIcon from '../assets/composing-icon.png';
import cdIcon from '../assets/cd-icon.png';
import './Steps.css';

function UserTypeStep({ value, onChange, onNext }) {
  const handleSelect = (type) => {
    onChange(type);
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="step-content">
      <div className="options-grid">
        <button
          className={`option-card ${value === 'songwriter' ? 'selected' : ''}`}
          onClick={() => handleSelect('songwriter')}
        >
          <div className="option-icon">
            <img src={composingIcon} alt="Composing" className="option-icon-img" />
          </div>
          <h3>Songwriter / Producer</h3>
          <p>I create and write music</p>
        </button>

        <button
          className={`option-card ${value === 'artist' ? 'selected' : ''}`}
          onClick={() => handleSelect('artist')}
        >
          <div className="option-icon">
            <img src={cdIcon} alt="CD" className="option-icon-img" />
          </div>
          <h3>Recording Artist</h3>
          <p>I perform and release music</p>
        </button>
      </div>
    </div>
  );
}

export default UserTypeStep;
