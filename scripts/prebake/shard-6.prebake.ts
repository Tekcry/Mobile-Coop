import { test } from 'vitest';
import { bakeShard, SHARDS } from './plan';

test('prebake shard 6', () => bakeShard(6, SHARDS));
