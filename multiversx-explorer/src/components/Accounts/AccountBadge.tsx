import React from 'react';
import { Box, Avatar, Typography } from '@mui/material';

interface AccountBadgeProps {
  address: string;
  displayText?: string;
}

// Gera uma cor baseada no endereço para identificação visual
const generateColorFromAddress = (address: string): string => {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 80%)`;
};

const AccountBadge: React.FC<AccountBadgeProps> = ({ address, displayText }) => {
  if (!address) return <Typography variant="body2">--</Typography>;
  
  const initials = address.substring(0, 2);
  const bgColor = generateColorFromAddress(address);
  const text = displayText || address;
  
  return (
    <Box display="flex" alignItems="center">
      <Avatar 
        sx={{ 
          width: 32, 
          height: 32, 
          bgcolor: bgColor, 
          fontSize: '0.9rem', 
          fontWeight: 'bold',
          mr: 1 
        }}
      >
        {initials}
      </Avatar>
      <Typography variant="body2" component="span">
        {text}
      </Typography>
    </Box>
  );
};

export default AccountBadge; 