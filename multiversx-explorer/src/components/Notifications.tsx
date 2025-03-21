import React from 'react';
import { Snackbar, Alert, Stack } from '@mui/material';
import { useAppContext } from '../context/AppContext';

const Notifications: React.FC = () => {
  const { notifications, removeNotification } = useAppContext();

  const handleClose = (id: string) => (_: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    removeNotification(id);
  };

  return (
    <Stack spacing={2} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000 }}>
      {notifications.map((notification) => (
        <Snackbar 
          key={notification.id}
          open={true}
          autoHideDuration={5000}
          onClose={handleClose(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => removeNotification(notification.id)} 
            severity={notification.type} 
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};

export default Notifications; 