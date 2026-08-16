import { useRef, useState } from 'react';
import FlatButton from '../../components/Buttons/FlatButton/FlatButton';
import NavBar from '../../components/NavBar/NavBar';
import { CircularProgress } from '@mui/material';
import urlJoin from 'url-join';

const ClaimSong = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');
  const artistRef = useRef();
  const titleRef = useRef();
  const messageRef = useRef();

  const handleClaimRequest = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setMessage('');
    setLoading(true);
    if (message) {
      setErrorMessage('You have already sent a request.');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(urlJoin(process.env.REACT_APP_BACKEND_URL, '/claim'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          artist: artistRef.current.value,
          title: titleRef.current.value,
          message: messageRef.current.value,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Your request has been sent. Thank you!');
      } else {
        setErrorMessage(data.detail);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error.detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className="page-content">
        <h1>Raise a case</h1>
        <div>
          <form>
            <label htmlFor="song-name">Title</label>
            <input ref={titleRef} type="text" id="song-name" name="song-name" />
            <label htmlFor="artist">Artist</label>
            <input ref={artistRef} type="text" id="artist" name="artist" />
            <label htmlFor="message">Message</label>
            <input ref={messageRef} type="text" id="message" name="message" />
            <FlatButton className="mx-auto" onClick={handleClaimRequest}>
              {loading ? <CircularProgress /> : 'Send Request'}
            </FlatButton>
            <div className={`${errorMessage ? '' : 'hidden'} error-message`}>{errorMessage}</div>
            <div className={`${message ? '' : 'hidden'} message`}>Bruh</div>
          </form>
        </div>
      </div>
    </>
  );
};
export default ClaimSong;
