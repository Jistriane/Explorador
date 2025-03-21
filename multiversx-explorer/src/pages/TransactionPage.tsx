import React from 'react';
import { Container, Box } from '@mui/material';
import SearchBar from '../components/SearchBar';
import TransactionDetails from '../components/Transactions/TransactionDetails';

const TransactionPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box mt={4}>
        <SearchBar />
        <TransactionDetails />
      </Box>
    </Container>
  );
};

export default TransactionPage; 