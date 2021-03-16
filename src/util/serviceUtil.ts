import ChildEntity from '../interfaces/childEntity';
import ParentEntity from '../interfaces/parentEntity';
import ServiceOptions from '../interfaces/serviceOptions';

/* Module */
abstract class ServiceUtil {
    public static forParents(
        alias: string,
        parentEntities: ParentEntity[],
        action: (
            alias: string,
            parent: ParentEntity,
            serviceOptions?: ServiceOptions<any>
        ) => void,
        serviceOptions: ServiceOptions<any>
    ): void {
        for (const parent of parentEntities) {
            if (this.isNotOnly(serviceOptions, parent.name)) {
                break;
            }
            if (this.toIgnore(serviceOptions, alias + parent.alias)) {
                continue;
            }

            if (this.isNotOrigin(serviceOptions, parent)) {
                action(alias, parent, serviceOptions);
            }
        }
    }

    public static forChilds(
        alias: string,
        childEntities: ChildEntity[],
        action: (
            alias: string,
            child: ChildEntity,
            serviceOptions?: ServiceOptions<any>
        ) => void,
        serviceOptions: ServiceOptions<any>
    ): void {
        if (serviceOptions && serviceOptions.subitems) {
            for (const subitem of serviceOptions.subitems) {
                for (const child of childEntities) {
                    if (this.isNotOnly(serviceOptions, child.name)) {
                        break;
                    }
                    if (this.toIgnore(serviceOptions, alias + child.alias)) {
                        continue;
                    }
                    if (child.name === subitem) {
                        action(alias, child, serviceOptions);
                    }
                }
            }
        }
    }

    public static parseAndWhere(alias: string, name: string, andWhere: any): [string, any] {
        if (andWhere) {
            for (const andWhereKey of Object.keys(andWhere)) {
                if (`${alias}.${name}` === andWhereKey) {
                    return andWhere[andWhereKey];
                }
            }
        }

        return [undefined, undefined];
    }

    private static isNotOnly(serviceOptions: ServiceOptions<any>, name: string): boolean {
        return serviceOptions && serviceOptions.only && serviceOptions.only !== name;
    }

    private static toIgnore(serviceOptions: ServiceOptions<any>, alias: string): boolean {
        return serviceOptions.ignore && serviceOptions.ignore.indexOf(alias) !== -1;
    }

    private static isNotOrigin(serviceOptions: ServiceOptions<any>, parent: ParentEntity): boolean {
        return !serviceOptions || !serviceOptions.origin || parent.name !== serviceOptions.origin && !parent.alias.endsWith(serviceOptions.origin);
    }
}

export default ServiceUtil;
