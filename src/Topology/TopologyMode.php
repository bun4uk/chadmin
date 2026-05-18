<?php

declare(strict_types=1);

namespace App\Topology;

enum TopologyMode: string
{
    case Cloud = 'cloud';
    case Cluster = 'cluster';
    case Single = 'single';
}
