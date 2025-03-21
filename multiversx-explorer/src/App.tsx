import React, { useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import BlocksPage from './pages/BlocksPage';
import BlockPage from './pages/BlockPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionPage from './pages/TransactionPage';
import ErrorPage from './pages/ErrorPage';
import { ApolloProvider } from '@apollo/client';
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import AppProvider, { useAppContext } from './context/AppContext';
import Notifications from './components/Notifications';
import config from './config';
import AccountsPage from './pages/AccountsPage';
import AccountDetailsPage from './pages/AccountDetailsPage';
import { NotificationProvider } from './contexts/NotificationContext';
import websocketService from './services/websocket';

// Criar o cliente Apollo
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  if (networkError) console.error(`[Network error]: ${networkError}`);
});

const httpLink = new HttpLink({
  uri: config.api.url,
});

const client = new ApolloClient({
  link: errorLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// Componente para gerenciar o tema
const ThemedApp: React.FC = () => {
  const { isDarkMode } = useAppContext();

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
          primary: {
            main: '#1a4ed8',
          },
          secondary: {
            main: '#10b981',
          },
        },
      }),
    [isDarkMode]
  );

  // Inicializa os serviços quando o App é montado
  useEffect(() => {
    try {
      // Inicializa o serviço de WebSocket
      websocketService.disconnectAll(); // Garante que não há conexões anteriores
      
      // Iniciar conexões para diferentes tipos de dados
      websocketService.connect('blocks');
      websocketService.connect('transactions');
      websocketService.connect('accounts');
      websocketService.connect('stats');
      
      console.log('Aplicativo MultiversX Explorer iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao inicializar serviços, mas a aplicação continuará funcionando:', error);
    }

    // Cleanup quando o App for desmontado
    return () => {
      try {
        // Desconecta o serviço de WebSocket
        websocketService.disconnectAll();
      } catch (error) {
        console.error('Erro ao desconectar serviços:', error);
      }
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/blocks" element={<BlocksPage />} />
              <Route path="/blocks/:hash" element={<BlockPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transactions/:hash" element={<TransactionPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/:address" element={<AccountDetailsPage />} />
              <Route path="/error" element={<ErrorPage />} />
              <Route path="*" element={<ErrorPage message="Página não encontrada" />} />
            </Routes>
          </Layout>
          <Notifications />
        </Router>
      </NotificationProvider>
    </ThemeProvider>
  );
};

function App() {
  return (
    <ApolloProvider client={client}>
      <AppProvider>
        <ThemedApp />
      </AppProvider>
    </ApolloProvider>
  );
}

export default App;
