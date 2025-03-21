import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  Box, 
  Pagination,
  CircularProgress,
  Chip,
  useMediaQuery,
  useTheme,
  Tooltip
} from '@mui/material';
import { Link } from 'react-router-dom';
import { fetchRecentBlocks } from '../../services/api';
import { Block } from '../../types';
import config from '../../config';

interface BlockListProps {
  showTitle?: boolean;
  limitItems?: number;
  showPagination?: boolean;
  blocks?: Block[];
}

const BlockList: React.FC<BlockListProps> = ({ 
  showTitle = true, 
  limitItems, 
  showPagination = true,
  blocks: propBlocks
}) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState<boolean>(propBlocks ? false : true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const itemsPerPage = limitItems || config.settings.itemsPerPage;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // Se os blocos forem fornecidos via props, use-os diretamente
    if (propBlocks) {
      setBlocks(propBlocks);
      return;
    }

    const loadBlocks = async () => {
      setLoading(true);
      const data = await fetchRecentBlocks({ page, itemsPerPage });
      setBlocks(data);
      // Na API real, você obteria o total de páginas a partir da resposta
      setTotalPages(10); 
      setLoading(false);
    };

    loadBlocks();
  }, [page, itemsPerPage, propBlocks]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const truncateHash = (hash: string) => {
    // Se estiver em modo mobile, truncar o hash
    if (isMobile) {
      return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    }
    // Caso contrário, retornar o hash completo
    return hash;
  };

  const getRelativeTime = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return `${diff} seg atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
    return `${Math.floor(diff / 86400)} d atrás`;
  };

  // Se não tiver blocos, exiba uma mensagem
  if (!loading && blocks.length === 0) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <Typography variant="body1" color="textSecondary">
          Nenhum bloco encontrado
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {showTitle && (
        <Typography variant="h5" component="h2" gutterBottom>
          Blocos Recentes
        </Typography>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nonce</TableCell>
                  <TableCell>Hash</TableCell>
                  {!isMobile && <TableCell>Timestamp</TableCell>}
                  {!isTablet && <TableCell>Tamanho</TableCell>}
                  <TableCell>Transações</TableCell>
                  {!isTablet && <TableCell>Proposer</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {blocks.map((block) => (
                  <TableRow key={block.hash} hover>
                    <TableCell>
                      <Link to={`/blocks/${block.hash}`} style={{ textDecoration: 'none', color: '#3f51b5' }}>
                        {block.nonce}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/blocks/${block.hash}`} style={{ textDecoration: 'none', color: '#3f51b5' }}>
                        {truncateHash(block.hash)}
                      </Link>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Tooltip title={formatTimestamp(block.timestamp)}>
                          <span>{getRelativeTime(block.timestamp)}</span>
                        </Tooltip>
                      </TableCell>
                    )}
                    {!isTablet && <TableCell>{block.size.toLocaleString()} bytes</TableCell>}
                    <TableCell>
                      {block.txCount > 0 ? (
                        <Chip 
                          label={block.txCount} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      ) : (
                        block.txCount
                      )}
                    </TableCell>
                    {!isTablet && (
                      <TableCell>
                        <Link to={`/accounts/${block.proposer}`} style={{ textDecoration: 'none', color: '#3f51b5' }}>
                          {truncateHash(block.proposer)}
                        </Link>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {showPagination && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
                size="small"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default BlockList; 