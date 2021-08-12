import ChildEntity from './childEntity';
import ParentEntity from './parentEntity';

/* Module */
interface InnerEntity {
    /** 
     * Nome da subentidade (nome do campo na entidade atual)
     * endereco, telefone
     */
    name: string;
    /**
     * Alias da subentidade (alias que será utilizado na montagem da consulta)
     * <vazio>, endereco, telefone
     */
    alias: string;
    /** 
     * Entidades pai relacionadas a subentidade
     */
    parentEntities?: ParentEntity[];
    /** 
     * Entidades filho relacionadas a subentdidade
     */
    childEntities?: ChildEntity[];
}

export default InnerEntity;
