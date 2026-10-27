import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { UsuarioEntity } from './usuario.entity.js';

export const USUARIOS_REPO = Symbol('USUARIOS_REPO');

export interface NuevoUsuario {
  usuario: string;
  clave_hash: string;
  rol: UsuarioEntity['rol'];
}

export interface UsuariosRepository {
  buscarActivoPorNombre(usuario: string): Promise<UsuarioEntity | null>;
  buscarPorId(id: number): Promise<UsuarioEntity | null>;
  listar(): Promise<UsuarioEntity[]>;
  crear(datos: NuevoUsuario): Promise<UsuarioEntity>;
}

@Injectable()
export class TypeOrmUsuariosRepository implements UsuariosRepository {
  constructor(@InjectRepository(UsuarioEntity) private readonly repo: Repository<UsuarioEntity>) {}

  buscarActivoPorNombre(usuario: string): Promise<UsuarioEntity | null> {
    return this.repo.findOneBy({ usuario, activo: true });
  }

  buscarPorId(id: number): Promise<UsuarioEntity | null> {
    return this.repo.findOneBy({ id });
  }

  listar(): Promise<UsuarioEntity[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  crear(datos: NuevoUsuario): Promise<UsuarioEntity> {
    return this.repo.save(this.repo.create({ ...datos, activo: true }));
  }
}
