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
- TypeScript
- Material UI
- Apollo Client para GraphQL
- WebSockets para atualizações em tempo real

## Pré-requisitos
- Node.js (versão 14 ou superior)
- npm (versão 7 ou superior)

## Instalação

Clone o repositório:
```bash
git clone https://github.com/seu-usuario/multiversx-explorer.git
cd multiversx-explorer
```

Instale as dependências:
```bash
npm install
```

## Executando em Ambiente de Desenvolvimento
```bash
npm run start
```

O aplicativo estará disponível em `http://localhost:3000`.

## Criando Build de Produção
```bash
npm run build
```

## Deploy

### Deploy com Vercel
O método mais simples para fazer deploy é usando o Vercel:

1. Criar uma conta em [vercel.com](https://vercel.com)
2. Instalar a CLI do Vercel:
   ```bash
   npm install -g vercel
   ```
3. Login na sua conta:
   ```bash
   vercel login
   ```
4. Deploy do projeto:
   ```bash
   vercel
   ```

### Deploy com Netlify
Também é possível fazer deploy usando o Netlify:

1. Criar uma conta em [netlify.com](https://netlify.com)
2. Deploy do projeto:
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy
   ```

### Deploy em servidor próprio
Para fazer deploy em um servidor próprio:

1. Gere o build do projeto:
   ```bash
   npm run build
   ```

2. Copie a pasta `build` para o seu servidor web (Apache, Nginx, etc.)

3. Configure seu servidor web para servir a aplicação:

   **Exemplo para Nginx:**
   ```
   server {
     listen 80;
     server_name seu-dominio.com;
     root /caminho/para/build;
     index index.html;
     
     location / {
       try_files $uri $uri/ /index.html;
     }
   }
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

## Estrutura do Projeto

- `/src/components`: Componentes reutilizáveis
  - `/Blocks`: Componentes relacionados a blocos
  - `/Transactions`: Componentes relacionados a transações
  - `/Accounts`: Componentes relacionados a contas
  - `/Layout`: Componentes de layout (Header, Footer)
- `/src/pages`: Páginas da aplicação
- `/src/services`: Serviços para comunicação com a API
- `/src/types`: Definições de tipos TypeScript

## API

Este projeto utiliza a API GraphQL da MultiversX para buscar dados da blockchain. As consultas estão definidas no arquivo `/src/services/api.ts`.

## Melhorias Futuras

- Adicionar paginação real
- Implementar filtragem avançada
- Adicionar gráficos e estatísticas
- Implementar histórico de busca
- Adicionar suporte para tokens e NFTs
- Melhorar a experiência mobile
