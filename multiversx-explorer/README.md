# MultiversX Blockchain Explorer

Um explorador de blocos para a blockchain MultiversX, desenvolvido com React e TypeScript.

## Funcionalidades

- Visualização de blocos recentes
- Visualização de transações recentes
- Detalhes de blocos
- Detalhes de transações
- Detalhes de contas
- Busca por hash de bloco, hash de transação ou endereço de conta

## Tecnologias Utilizadas

- React
- TypeScript
- React Router DOM
- Material UI
- Apollo Client (GraphQL)

## Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/multiversx-explorer.git

# Entre no diretório
cd multiversx-explorer

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm start
```

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

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## Licença

Este projeto está licenciado sob a licença MIT.
