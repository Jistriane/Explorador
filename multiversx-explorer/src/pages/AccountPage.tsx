import React from 'react';
import { Container, Box } from '@mui/material';
import SearchBar from '../components/SearchBar';
import AccountDetails from '../components/Accounts/AccountDetails';

const AccountPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box mt={4}>
        <SearchBar />
        <AccountDetails />
      </Box>
    </Container>
  );
};

export default AccountPage; 