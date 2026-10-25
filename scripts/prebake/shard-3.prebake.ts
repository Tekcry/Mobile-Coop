import { test } from 'vitest';
import { bakeShard, SHARDS } from './plan';

test('prebake shard 3', () => bakeShard(3, SHARDS));
