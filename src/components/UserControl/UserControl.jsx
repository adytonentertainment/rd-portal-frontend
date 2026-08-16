import styles from './usercontrol.module.css';
import Dropdown from '../Dropdown/Dropdown';
import { CiUser, CiLogout, CiSettings } from 'react-icons/ci';
import { useNavigate } from 'react-router-dom';
import GlassButton from '../Buttons/GlassButton/GlassButton';

const UserControl = ({ username }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <>
      <Dropdown
        className={styles.userDropdownWrapper}
        clicker={
          <GlassButton stopPropagation={false}>
            <CiUser />
            {username}
          </GlassButton>
        }
        directionAmount={60}
      >
        <ul className={styles.userDropdownList}>
          <li onClick={handleSettings}>
            <CiSettings />
            Settings
          </li>
          <hr className="solid border-[#858485]" />
          <li onClick={handleLogout}>
            <CiLogout />
            Logout
          </li>
        </ul>
      </Dropdown>
    </>
  );
};

export default UserControl;
