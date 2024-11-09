# Firebase Functions - Projeto Taugor

Este diretório contém as Firebase Functions implementadas para a aplicação de gestão de documentos de funcionários. Todas as funções estão no arquivo `index.js`, e foram desenvolvidas para lidar com operações de CRUD e gerenciamento de histórico de alterações dos funcionários.

## Desenvolvedor

- **André Silva Peixoto**

## Funcionalidades das Cloud Functions

As Cloud Functions foram desenvolvidas para realizar as seguintes operações:
- **Listar Funcionários**: Retorna todos os funcionários cadastrados no Firestore.
- **Detalhar Funcionário**: Exibe informações detalhadas de um funcionário específico.
- **Cadastrar Funcionário**: Adiciona um novo funcionário ao Firestore com os dados fornecidos.
- **Editar Funcionário**: Atualiza informações do funcionário e armazena um histórico das alterações realizadas.
- **Deletar Funcionário**: Remove o funcionário e seus documentos associados do Firestore e Storage.

## Estrutura do Arquivo `index.js`

O arquivo `index.js` inclui:

1. **Configurações**:
   - Inicialização do Firebase Admin com credenciais do serviço.
   - Configuração do Firestore e Storage.
   - Middleware para validação de token para autenticação de usuário.
  
2. **Endpoints**:
   - **`/listar-funcionarios`**: Lista todos os funcionários cadastrados.
   - **`/detalhar-funcionario/:id`**: Retorna informações detalhadas de um funcionário específico.
   - **`/cadastrar-funcionario`**: Cadastra um novo funcionário com dados enviados pelo cliente.
   - **`/editar-funcionario/:id`**: Atualiza as informações do funcionário especificado, incluindo a geração de um histórico de mudanças.
   - **`/deletar-funcionario/:id`**: Exclui o funcionário e os arquivos relacionados, incluindo fotos de perfil no histórico.

## Configuração e Deploy

### Pré-requisitos

- **Firebase CLI**: Instale o Firebase CLI e faça login em sua conta.
  ```bash
  npm install -g firebase-tools
  firebase login
  ```

- **Credenciais do Firebase**: O arquivo `permissions.json` deve conter as credenciais do serviço para autenticar o Firebase Admin SDK.

### Instalação das Dependências

Navegue até o diretório `firebaseFunctions` e instale as dependências necessárias com o comando:

```bash
cd firebaseFunctions
npm install
```

### Deploy das Cloud Functions

Para fazer o deploy, execute o comando abaixo na raiz do projeto:

```bash
firebase deploy --only functions
```

## Endpoints e Autenticação

Todas as rotas das funções são protegidas por um middleware que verifica o token JWT do usuário, assegurando que apenas usuários autenticados possam realizar operações.

### Exemplo de Requisição Autenticada

Inclua o token JWT no cabeçalho `Authorization` para todas as requisições às funções:

```http
Authorization: Bearer <TOKEN_JWT>
```