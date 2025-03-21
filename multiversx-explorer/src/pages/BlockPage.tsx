import React from 'react';
import { Container, Box } from '@mui/material';
import SearchBar from '../components/SearchBar';
import BlockDetails from '../components/Blocks/BlockDetails';

const BlockPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box mt={4}>
        <SearchBar />
        <BlockDetails />
      </Box>
    </Container>
  );
};

export default BlockPage; 