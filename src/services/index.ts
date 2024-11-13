// src/services/index.ts
/**
 * Core Services 레이어는 Domain Logic과 CLI 레이어 사이의 중간 다리 역할입니다.
 * 각 서비스는 특정 도메인 로직을 추상화하고 CLI 레이어에게 인터페이스를 제공합니다.
 */

export * from './diff.service.js';
export * from './sync.service.js';
export * from './types.js';
