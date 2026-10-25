import { test } from 'vitest';
import { bakeShard, SHARDS } from './plan';

test('prebake shard 5', () => bakeShard(5, SHARDS));
