import { Fade, Modal } from '@mui/material';
import Backdrop from '@mui/material/Backdrop';
import axios from 'axios';
import { useContext, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { FaUpload } from 'react-icons/fa';
import { FaRegSquarePlus } from 'react-icons/fa6';
import { GoGraph } from 'react-icons/go';
import { HiMagnifyingGlass, HiFingerPrint } from 'react-icons/hi2';
import { RxCross2 } from 'react-icons/rx';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import urlJoin from 'url-join';
import { isValidHttpUrl } from '../../misc/helper';
import FlatButton from '../Buttons/FlatButton/FlatButton';
import GlassButton from '../Buttons/GlassButton/GlassButton';
import TransparentButton from '../Buttons/TransparentButton/TransparentButton';
import Dropdown from '../Dropdown/Dropdown';
import ManualSearch from '../ManualSearch/ManualSearch';
import SubscriptionButton from '../SubscriptionButton/SubscriptionButton';
import { SubscriptionContextProvider } from '../SubscriptionContext/SubscriptionContext';
import VeraxLogo from '../VeraxLogo/VeraxLogo';
import { UserContextProvider } from '../UserContext/UserContext';
import UserControl from '../UserControl/UserControl';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';
import styles from './dashboard-navbar.css';

const DashboardNavBar = forwardRef(
  ({ onDeleteCatalog = () => {}, onAddToCatalog = () => {}, onUploadCompleted = () => {} }, ref) => {
    const user = useContext(UserContextProvider);
    const subscriptionContext = useContext(SubscriptionContextProvider);
    const subscription = subscriptionContext?.subscription;
    const theme = useContext(ThemeContext);
    const navigate = useNavigate();
    const location = useLocation();
    const urlInputRef = useRef();

    const [openUploadModal, setOpenUploadModal] = useState(false);
    const [openCatalogAddModal, setOpenCatalogAddModal] = useState(false);
    const [openConfimationModal, setOpenConfimationModal] = useState(false);
    const [enteredDrag, setEnteredDrag] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);

    const [currentToastIds, setCurrentToastIds] = useState([]);

    // Expose method to open the upload modal from parent component
    useImperativeHandle(ref, () => ({
      openUploadModal: () => setOpenUploadModal(true),
    }));

    const handleSendConfirmation = () => {};

    const handleUploadURL = async (event) => {
      const url = urlInputRef.current.value;

      if (!isValidHttpUrl(url)) {
        toast('The URL you entered is not valid.');
        return;
      }
      const token = localStorage.getItem('token');
      try {
        const response = await axios.post(urlJoin(process.env.REACT_APP_BACKEND_URL, `scan/tracks/${encodeURI(url)}`), {
          headers: { Authorization: `Bearer ${token}` },
          onUploadProgress: (p) => {
            const progress = p.loaded / p.total;
            // TODO: Do something with progress
          },
        });
        setOpenUploadModal(false);
        let loading = response.data.loading;
        // TODO: Reload when still loading
      } catch (error) {
        // user needs to confirm that he wants to go over the threshold
        if (error.status === 403) {
          setOpenUploadModal(false);
          setOpenCatalogAddModal(false);
          setOpenConfimationModal(true);
        }
        toast(error.response.data.detail);
      }
    };

    const checkFileExists = async (filename) => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(urlJoin(process.env.REACT_APP_BACKEND_URL, 'scan/tracks'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: 1,
            per_page: 1000, // Get all tracks to check filenames
          },
        });
        if (response.status === 200) {
          const existingFiles = response.data.songs || [];
          return existingFiles.some((track) => track.filename === filename);
        }
        return false;
      } catch (error) {
        console.error('Error checking file existence:', error);
        return false;
      }
    };

    const handleUpload = async (event) => {
      event.preventDefault();
      // files can be uploaded with either drag and drop or selecting a file
      // from a file browser
      let files;
      if (event.type === 'drop') files = event.dataTransfer.files;
      else files = event.target.files;
      const token = localStorage.getItem('token');
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check if file with same name already exists
        const fileExists = await checkFileExists(file.name);
        if (fileExists) {
          toast.error(`File "${file.name}" already exists. Please rename the file or remove the existing one.`);
          continue; // Skip this file and continue with next one
        }

        const formData = new FormData();
        const currentToast = toast('Uploading ' + file.name + '...');
        formData.append('file', file);
        try {
          const response = await axios.post(
            urlJoin(process.env.REACT_APP_BACKEND_URL, 'scan/tracks/comprehensive'),
            formData,
            {
              headers: {
                'Content-Type': file.type,
                Authorization: `Bearer ${token}`,
              },
              onUploadProgress: (p) => {
                const progress = p.loaded / p.total;
                toast.update(currentToast, {
                  progress,
                });
              },
            }
          );
          setOpenUploadModal(false);
          toast.update(currentToast, {
            render: file.name + ' has been uploaded.',
            autoClose: 5000,
            type: 'success',
          });
        } catch (error) {
          // user needs to confirm that he wants to go over the threshold
          if (error.status === 403) {
            setOpenUploadModal(false);
            setOpenCatalogAddModal(false);
            setOpenConfimationModal(true);
          }
          toast.error(error.response?.data?.detail || 'Failed to upload file');
        } finally {
          onUploadCompleted();
        }
      }
    };

    const handleSendConfimation = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios({
          url: urlJoin(process.env.REACT_APP_BACKEND_URL, `/scan/confirm`),
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.status === 200) {
          toast('Your limit has been lifted.');
        }
      } catch (error) {
        // Error handling
      }
    };

    const handleDragEnter = async (e) => {
      e.preventDefault();
      const newDragValue = dragCounter + 1;
      if (newDragValue > 0) {
        setEnteredDrag(true);
      }
      setDragCounter(newDragValue);
    };

    const handleDragLeave = async (e) => {
      e.preventDefault();
      const newDragValue = dragCounter - 1;
      if (newDragValue == 0) {
        setEnteredDrag(false);
      }
      setDragCounter(newDragValue);
    };

    return (
      <>
        <div className="dashboard-navbar-container flex justify-between items-center">
          <div className="flex items-center" />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            className="flex gap-8 justify-center items-center"
          >
            <GlassButton className="flex justify-center items-center" onClick={() => navigate('/tunescan')}>
              <HiFingerPrint />
              Tune Scan
            </GlassButton>
            <GlassButton className="flex justify-center items-center" onClick={() => navigate('/catalog')}>
              <GoGraph />
              Catalog
            </GlassButton>
          </div>
          <div className="flex items-center gap-4">
            <SubscriptionButton subscriptionData={subscription} />
            <UserControl username={user.sub} />
          </div>
        </div>
        <Modal
          aria-labelledby="transition-modal-title"
          aria-describedby="transition-modal-description"
          open={openUploadModal}
          onClose={() => setOpenUploadModal(false)}
          closeAfterTransition
          keepMounted
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <Fade in={openUploadModal} className="upload-modal">
            <div>
              <div className="mb-4 flex justify-end">
                <GlassButton onClick={() => setOpenUploadModal(false)}>
                  <RxCross2 className="cursor-pointer" size="22" />
                </GlassButton>
              </div>
              <div onDragOver={(event) => event.preventDefault()} className="flex flex-col">
                <div
                  className="drop-file-section"
                  onDrop={handleUpload}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                >
                  <FaUpload size="80" className={`upload-logo ${enteredDrag ? 'upload-logo-dragged' : ''}`} />
                  <div className="mt-3">Drag & Drop to Upload Your Tracks</div>
                  <div className="text-xs mt-3 text-[var(--secondary)]">Only .wav and .mp3 files can be uploaded.</div>
                </div>
                <div className="alt-upload">
                  <div>OR</div>
                  <div className="upload-control">
                    <FlatButton>
                      <label htmlFor="track-upload" className="cursor-pointer">
                        Browse...
                      </label>
                    </FlatButton>
                    <input id="track-upload" type="file" onChange={handleUpload} className="track-input" multiple />
                  </div>
                  <div>OR</div>
                  <div className="flex justify-center gap-10">
                    <input ref={urlInputRef} type="text" placeholder="Paste link..." className="w-full" />
                    <FlatButton onClick={handleUploadURL} className="w-[10rem]">
                      Upload from URL
                    </FlatButton>
                  </div>
                </div>
              </div>
              <div className="text-xs">
                Note: After determining the fingerprint, we will immediately delete your file. The ownership of your
                song will be fully retained.
              </div>
            </div>
          </Fade>
        </Modal>

        <Modal
          aria-labelledby="transition-modal-title"
          aria-describedby="transition-modal-description"
          open={openCatalogAddModal}
          onClose={() => setOpenCatalogAddModal(false)}
          closeAfterTransition
          keepMounted
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <Fade in={openCatalogAddModal} className="catalog-modal">
            <div>
              <div className="mb-4 flex justify-end">
                <GlassButton onClick={() => setOpenCatalogAddModal(false)}>
                  <RxCross2 className="cursor-pointer" size="22" />
                </GlassButton>
              </div>
              <div onDragOver={(event) => event.preventDefault()} className="flex flex-col">
                <ManualSearch
                  onAddToCatalog={() => {
                    setOpenCatalogAddModal(false);
                    onAddToCatalog();
                  }}
                  onDeleteCatalog={onDeleteCatalog}
                />
              </div>
            </div>
          </Fade>
        </Modal>
        <Modal
          aria-labelledby="transition-modal-title"
          aria-describedby="transition-modal-description"
          open={openConfimationModal}
          onClose={() => setOpenConfimationModal(false)}
          closeAfterTransition
          keepMounted
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
            },
          }}
        >
          <Fade in={openConfimationModal}>
            <div>
              <div className="mb-4 flex justify-end">
                <GlassButton onClick={() => setOpenConfimationModal(false)}>
                  <RxCross2 className="cursor-pointer" size="22" />
                </GlassButton>
              </div>
              <div>
                <h1>Hold On!</h1>
                <p>
                  The upload you are about to perform will exceed your monthly limit. Your current payment method will
                  be charged at the end of the month. Are you sure you want to continue?
                </p>
                <FlatButton onClick={handleSendConfimation}>Confirm</FlatButton>
              </div>
            </div>
          </Fade>
        </Modal>
      </>
    );
  }
);
export default DashboardNavBar;
