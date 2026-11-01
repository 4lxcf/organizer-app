# Meu ritmo

Uma aplicação pessoal para organizar tarefas (com datas de início e fim e horários opcionais), planner com calendário por hora nas visualizações de dia e semana, calendário mensal e suporte para arrastar e redimensionar tarefas entre datas e horários, hábitos, finanças, metas e diário em um só lugar.

## Como abrir

Abra `index.html` em um navegador moderno. Não é necessário criar uma conta nem instalar dependências.

## Organização do código

O projeto segue uma separação inspirada em Clean Architecture e usa módulos ES nativos, sem etapa de build:

- `src/domain/`: regras puras do domínio, como datas, status, áreas e prioridades das tarefas.
- `src/application/`: casos de uso para criar, atualizar e mover tarefas.
- `src/infrastructure/`: adaptador de persistência no `localStorage` do navegador.
- `src/presentation/`: interface, renderização, eventos e estilos.
- `src/main.js`: composição das camadas e inicialização do app.

As dependências de regras seguem a direção apresentação → aplicação → domínio. `src/main.js` injeta o adaptador de armazenamento da infraestrutura na inicialização; as regras de domínio não dependem da interface nem do navegador.

## Planner

Ao criar ou editar uma tarefa, informe o título e, se quiser, uma descrição que se expande conforme o texto. Data, horário, área e prioridade ficam organizados em campos compactos; as datas e os horários são opcionais. As áreas aparecem em ordem alfabética, com **Outros** para atividades sem uma área específica. As prioridades são **Urgente e Importante**, **Importante**, **Urgente** e **Quando der**. Para informar o horário em 24 horas (`HH:MM`), digite apenas os números nos campos de hora e minuto; os dois-pontos ficam fixos. Se a tarefa tiver horários, o mesmo intervalo se repete em cada dia selecionado. Para uma atividade que ocupa o dia todo, informe apenas as datas. No calendário de dia/semana, use as alças superior e inferior do cartão para ajustar os horários e as laterais para mudar as datas. No mês, arraste as alças laterais para ajustar o período da atividade.

Na tela de tarefas, alterne entre **Dia a Dia**, o Kanban (**A Fazer**, **Fazendo** e **Feito**) e os quadrantes de Eisenhower. Em Dia a Dia, a primeira coluna reúne as tarefas em atraso e as quatro seguintes mostram hoje e os próximos três dias; ao lado de hoje aparece o progresso de tarefas concluídas sobre o total. Arraste tarefas entre dias para alterar suas datas, entre colunas do Kanban para mudar o status ou entre quadrantes para alterar a prioridade. O Kanban ordena por data e horário e, em caso de empate, por prioridade; Eisenhower ordena por data e horário. A data atual fica abaixo do nome do app na navegação lateral, e o controle de tema fica junto de **Dados e ajustes**.

## Dados e privacidade

As informações são salvas no armazenamento local do navegador deste aparelho. Elas não são enviadas a um servidor. Se os dados do navegador forem apagados ou você trocar de aparelho, use **Dados e ajustes → Baixar cópia de segurança** e guarde o arquivo em um local seguro. A opção **Restaurar cópia** substitui os dados atuais pelos do arquivo escolhido.

Use **Dados e ajustes → Apagar todos os meus dados** para limpar o armazenamento local do app. Essa ação não pode ser desfeita.
