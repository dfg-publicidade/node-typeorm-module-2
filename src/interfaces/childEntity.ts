import JoinType from '../enums/joinType';

/* Module */
interface ChildEntity {
    /**
     * Tipo da junção
     * innerJoin, innerJoinAndSelect, leftJoin, leftJoinAndSelect
     */
    joinType?: JoinType;
    /** 
     * Nome de junção (nome do campo na entidade atual)
     * aluno, trabalho, usuario
     */
    name: string;
    /**
     * Alias da junção (alias que será utilizado na montagem da consulta)
     * Aluno, Trabalho, Usuario
     */
    alias: string;
    /**
     * Serviço de dados da entidade
     * AlunoService, TrabalhoService, UsuarioService
     */
    service: any;
    /**
     * Indicador de dependência (serão feitas as consultas padrão da entidade relacionada)
     * Aluno -> Usuário
     */
    dependent?: boolean;
    /**
     * Subitens que devem ser obrigatoriamente selecionados
     */
    subitems?: string[];
    /**
     * Restringe as entidades pai da entidade que está sendo incluída a lista informada
     */
    only?: string;
    /**
     * Opções de filtro para as subentidades
     */
    andWhere?: string;
}

export default ChildEntity;
