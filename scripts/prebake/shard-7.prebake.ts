import { test } from 'vitest';
import { bakeShard, SHARDS } from './plan';

test('prebake shard 7', () => bakeShard(7, SHARDS));
