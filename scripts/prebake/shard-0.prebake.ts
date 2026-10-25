import { test } from 'vitest';
import { bakeShard, SHARDS } from './plan';

test('prebake shard 0', () => bakeShard(0, SHARDS));
