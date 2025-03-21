import { GithubRepository, Item, Organization, Repository } from 'common';

export interface ItemsDataStatus {
  updateStatus(status: boolean): void;
}

export interface EmbedData {
  items?: Item[];
  crunchbase_data?: CrunchbaseData;
  github_data?: GithubData;
}

export interface CrunchbaseData {
  [key: string]: Organization;
}

export interface GithubData {
  [key: string]: GithubRepository;
}

export class ItemsDataGetter {
  private updateStatus?: ItemsDataStatus;
  private landscapeData: { [key: string]: EmbedData } = {};

  // Subscribe to the updateStatus
  public subscribe(updateStatus: ItemsDataStatus) {
    this.updateStatus = updateStatus;
  }

  public fetchItems(classifyBy: string, key: string, basePath: string) {
    const name = `${classifyBy}_${key}`;
    const url =
      import.meta.env.MODE === 'development'
        ? `http://localhost:8000/data/embed_full_${name}.json`
        : `${basePath}/data/embed_full_${name}.json`;

    fetch(url)
      .then((res) => res.json())
      .then((data: EmbedData) => {
        this.initialDataPreparation(data, name).then(() => {
          if (this.updateStatus) {
            this.updateStatus.updateStatus(true);
          }
        });
      });
  }

  private async initialDataPreparation(data: EmbedData, name: string) {
    await this.extendItemsData(data.items, data.crunchbase_data, data.github_data).then(
      (items) =>
        (this.landscapeData[name] = {
          ...data,
          items: items,
        })
    );
  }

  public getAvailableKeys(): string[] {
    return Object.keys(this.landscapeData);
  }

  public isReady(name: string): boolean {
    return !!this.landscapeData[name];
  }

  private getUrlLogo(logo: string): string {
    return import.meta.env.MODE === 'development' ? `http://localhost:8000/${logo}` : `../${logo}`;
  }

  private getUrlClomonitorImage(reportSummary?: string): string | undefined {
    if (reportSummary) {
      return import.meta.env.MODE === 'development' ? `http://localhost:8000/${reportSummary}` : `../${reportSummary}`;
    }
    return;
  }

  // Extend items with crunchbase and github data
  private async extendItemsData(
    items?: Item[],
    crunchbaseData?: CrunchbaseData,
    githubData?: GithubData
  ): Promise<Item[]> {
    const itemsList: Item[] = [];

    if (items) {
      items.forEach((item: Item) => {
        const extendedItem = { ...item };
        // Extend Item with crunchbase_data
        if (item.crunchbase_url && crunchbaseData && crunchbaseData[item.crunchbase_url!]) {
          extendedItem.crunchbase_data = crunchbaseData[item.crunchbase_url!];
        }

        // Extend repositories Item with github_data
        if (item.repositories && githubData) {
          const tmpRepositories: Repository[] = [];
          item.repositories.forEach((repo: Repository) => {
            const tmpRepo = { ...repo };
            if (githubData[repo.url]) {
              tmpRepo.github_data = githubData[repo.url];
            }
            tmpRepositories.push(tmpRepo);
          });
          extendedItem.repositories = tmpRepositories;
        }
        itemsList.push({
          ...extendedItem,
          logo: this.getUrlLogo(extendedItem.logo),
          clomonitor_report_summary: this.getUrlClomonitorImage(extendedItem.clomonitor_report_summary),
        });
      });
    }
    return itemsList;
  }

  // Get item by id
  public getItemById(classifyBy: string, key: string, id: string): Item | undefined {
    const name = `${classifyBy}_${key}`;
    if (this.isReady(name) && this.landscapeData[name].items) {
      return this.landscapeData[name]!.items!.find((i: Item) => id === i.id);
    }
  }
}

// Create an instance of the ItemsDataGetter
const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;
