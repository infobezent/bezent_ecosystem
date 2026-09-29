import { platformUserRepository, PlatformUserRepository } from '../repository/user.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../app/errors/AppError.js';
import type { CreateUserDto, PlatformUserRecord, UserAccountStatus, UserFilter } from '../types/user.types.js';

export class PlatformUserService {
  constructor(
    private readonly repo: PlatformUserRepository = platformUserRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  async listUsers(filter: UserFilter): Promise<{ items: PlatformUserRecord[]; total: number }> {
    return this.repo.list(filter);
  }

  async getUserById(id: string): Promise<PlatformUserRecord> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError(`User '${id}' not found`);
    }
    return user;
  }

  async createUser(
    dto: CreateUserDto,
    actor?: { id?: string; email?: string },
  ): Promise<PlatformUserRecord> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError(`User with email '${dto.email}' already exists`);
    }

    const created = await this.repo.create(dto);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'user_created',
      targetType: 'user',
      targetId: created.id,
      metadata: { email: created.email, isSuperAdmin: created.isSuperAdmin },
    });

    return created;
  }

  async updateStatus(
    id: string,
    status: UserAccountStatus,
    actor?: { id?: string; email?: string },
  ): Promise<PlatformUserRecord> {
    if (actor?.id === id && status !== 'active') {
      throw new BadRequestError('Cannot deactivate or suspend your own active administrator account');
    }

    const existing = await this.getUserById(id);
    const updated = await this.repo.updateStatus(id, status);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'user_status_changed',
      targetType: 'user',
      targetId: id,
      metadata: { previousStatus: existing.status, newStatus: status },
    });

    return updated;
  }

  async updateRole(
    id: string,
    isSuperAdmin: boolean,
    actor?: { id?: string; email?: string },
  ): Promise<PlatformUserRecord> {
    if (actor?.id === id && !isSuperAdmin) {
      throw new BadRequestError('Cannot revoke your own Super Admin privileges');
    }

    const existing = await this.getUserById(id);
    const updated = await this.repo.updateRole(id, isSuperAdmin);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'user_role_changed',
      targetType: 'user',
      targetId: id,
      metadata: { previousSuperAdmin: existing.isSuperAdmin, newSuperAdmin: isSuperAdmin },
    });

    return updated;
  }
}

export const platformUserService = new PlatformUserService();
