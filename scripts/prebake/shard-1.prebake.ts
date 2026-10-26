import { test } from 'vitest';
import { bakeShard, SHARDS } from './plan';

test('prebake shard 1', () => bakeShard(1, SHARDS));
