import User from '#models/user'

export enum UserRoles {
  DEFAULT = 1,
  CONTRIBUTOR = 2,
  MODERATOR = 50,
  ADMIN = 99,
}

const roleAbilities = {
  [UserRoles.DEFAULT]: ['rate1:150', 'rate2:50', 'rate3:10', 'item:add'],
  [UserRoles.CONTRIBUTOR]: [
    'rate1:150',
    'rate2:50',
    'rate3:20',
    'item:add',
    'item:edit',
    'item:delete',
    'item:merge',
  ],
  [UserRoles.MODERATOR]: [
    'rate1:300',
    'rate2:100',
    'rate3:25',
    'item:add',
    'item:edit',
    'item:delete',
    'item:merge',
    'user:edit',
    'user:delete',
    'server:add',
    'server:edit',
    'server:delete',
  ],
  [UserRoles.ADMIN]: [
    'rate1:500',
    'rate2:100',
    'rate3:25',
    'item:add',
    'item:edit',
    'item:delete',
    'item:merge',
    'user:edit',
    'user:delete',
    'server:add',
    'server:edit',
    'server:delete',
    'admin',
  ],
}

export class UserAbilities {
  private abilities: string[]
  private readonly user: User | null

  constructor(abilities?: string[], user?: User) {
    this.abilities = abilities ?? []
    this.user = user ?? null
  }

  public hasAbility(ability: string): boolean {
    return this.abilities.includes(ability)
  }

  public getRate(r: number): number | null {
    const key = `rate${r}:`
    const rate = this.abilities.find((ability) => ability.startsWith(key))
    if (rate) {
      const rateValue = rate.split(':')[1]
      return Number.parseFloat(rateValue)
    }
    return null
  }

  public getAbilities(): string[] {
    return this.abilities
  }

  public async addAbility(ability: string): Promise<void> {
    if (!this.hasAbility(ability)) {
      this.abilities.push(ability)
    }
    if (this.user) await this.user.save()
  }

  public getUserAbilities(): string[] {
    if (!this.user) throw new Error('User not set')
    const roleNumber: UserRoles = this.user.role as UserRoles
    const globalRoleAbilities: string[] = roleAbilities[roleNumber]
    const customAbilities: string[] = this.user.customAbilities ?? []
    this.abilities = [...globalRoleAbilities, ...customAbilities]
    return this.abilities
  }
}
