import { test } from 'vitest';
import { bakeShard, SHARDS } from './plan';

test('prebake shard 4', () => bakeShard(4, SHARDS));
