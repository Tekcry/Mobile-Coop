import { test } from 'vitest';
import { bakeShard, SHARDS } from './plan';

test('prebake shard 2', () => bakeShard(2, SHARDS));
