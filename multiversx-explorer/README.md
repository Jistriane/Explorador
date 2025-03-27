# MultiversX Explorer

## Sobre o Projeto

MultiversX Explorer é uma aplicação web para visualização e interação com a blockchain MultiversX. Permite aos usuários explorar blocos, transações, contas e estatísticas da rede em tempo real.

## Funcionalidades

- Visualização de estatísticas da rede em tempo real
- Exploração de blocos e transações
- Busca por endereços, hashes de transações e blocos
- Detalhamento de transações e contas
- Atualizações via WebSocket para dados em tempo real

## Tecnologias Utilizadas

- React 19
- TypeScript 4.9.5
- Material UI 6.4.8
- Apollo Client 3.13.4 para GraphQL
- React Router 7.4.0
- Axios 1.8.4 para requisições HTTP

## Pré-requisitos

- Node.js (versão 16 ou superior)
- npm (versão 8 ou superior)

## Instalação

Clone o repositório:

```bash
git clone https://github.com/Jistriane/Explorador.git
cd multiversx-explorer
```

Instale as dependências:

```bash
npm install
```

## Executando em Ambiente de Desenvolvimento

```bash
npm start
```

O aplicativo estará disponível em `http://localhost:3000`.

## Scripts Disponíveis

- `npm start`: Inicia o servidor de desenvolvimento
- `npm build`: Cria uma build de produção
- `npm test`: Executa os testes
- `npm eject`: Ejecta as configurações do Create React App

## Estrutura do Projeto

- `/src`: Código fonte da aplicação
  - `/components`: Componentes reutilizáveis
  - `/pages`: Páginas da aplicação
  - `/services`: Serviços para comunicação com a API
  - `/types`: Definições de tipos TypeScript
- `/public`: Arquivos estáticos
- `/docs`: Documentação do projeto
- `/build`: Build de produção

## Configuração do Ambiente

O projeto utiliza variáveis de ambiente para configuração. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
REACT_APP_API_URL=sua_url_api
REACT_APP_WS_URL=sua_url_websocket
```

## Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie sua branch de feature (`git checkout -b feature/nome-da-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nome-da-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

## Melhorias Futuras

- Adicionar paginação real
- Implementar filtragem avançada
- Adicionar gráficos e estatísticas
- Implementar histórico de busca
- Adicionar suporte para tokens e NFTs
- Melhorar a experiência mobile
- Implementar testes automatizados
- Adicionar documentação de API
- Implementar cache de dados
- Adicionar suporte para múltiplos idiomas
